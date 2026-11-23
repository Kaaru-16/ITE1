<?php

function liveQuery(PDO $db, string $sql, array $params = []): PDOStatement
{
    $query = $db->prepare($sql);
    $query->execute($params);
    return $query;
}

function ensureBookingAccessColumn(PDO $db): void
{
    if (!liveQuery($db, "SHOW COLUMNS FROM users LIKE 'booking_access'")->fetch()) {
        $db->exec("ALTER TABLE users ADD booking_access VARCHAR(10) NOT NULL DEFAULT 'review'");
    }
}

function liveUser(array $record, bool $ownAccount = false): array
{
    return publicUser([
        'id' => (int) $record['user_id'],
        'name' => $record['display_name'],
        'email' => $record['email'],
        'role' => $record['role'] === 'director' ? 'admin' : $record['role'],
        'status' => $record['access_status'],
        'booking_access' => $record['booking_access'],
        'profile_photo' => $record['profile_photo'] ?? null,
    ], $ownAccount);
}

function liveBookings(PDO $db, array $actor): array
{
    if ($actor['role'] === 'staff' && !in_array($actor['booking_access'], ['view', 'review', 'view_all', 'review_all'], true)) {
        return [];
    }
    $sql = 'SELECT o.order_id, o.travel_date, o.pax_number, o.order_status, o.order_req,
                   o.assigned_user_id, c.customer_name, c.customer_email, c.customer_cell,
                   p.package_name, p.package_price, n.nation_name, u.display_name AS assignee
            FROM order_details AS o
            JOIN customer_data AS c ON c.customer_id = o.customer_id
            JOIN packages AS p ON p.package_id = o.package_id
            JOIN nations AS n ON n.nation_id = p.nation_id
            LEFT JOIN users AS u ON u.user_id = o.assigned_user_id';
    $params = [];
    if ($actor['role'] !== 'admin' && !in_array($actor['booking_access'], ['view_all', 'review_all'], true)) {
        $sql .= ' WHERE o.assigned_user_id = ?';
        $params[] = $actor['id'];
    }
    $bookings = [];
    foreach (liveQuery($db, $sql . ' ORDER BY o.order_id DESC', $params) as $row) {
        $bookings[] = [
            'reference' => (string) $row['order_id'],
            'traveler' => $row['customer_name'],
            'email' => $row['customer_email'],
            'phone' => $row['customer_cell'] ?: 'Not provided',
            'nation' => $row['nation_name'],
            'package' => $row['package_name'],
            'travel_date' => $row['travel_date'],
            'guests' => (int) $row['pax_number'],
            'rate' => (float) $row['package_price'],
            'requests' => $row['order_req'],
            'status' => $row['order_status'],
            'assigned_to' => $row['assignee'] ?? 'Unassigned',
            'assigned_user_id' => $row['assigned_user_id'] === null ? null : (int) $row['assigned_user_id'],
        ];
    }
    return $bookings;
}

function saveLiveStaff(PDO $db, array $input, bool $signup): never
{
    $id = $signup ? 0 : (int) ($input['user_id'] ?? 0);
    $status = $signup ? 'pending' : field($input, 'status');
    if (!in_array($status, ['pending', 'approved', 'rejected', 'disabled'], true)) {
        reply(['error' => 'Choose a valid access status.'], 422);
    }
    $name = field($input, 'name');
    $email = strtolower(field($input, 'email'));
    $password = is_string($input['password'] ?? null) ? $input['password'] : '';
    if ($error = staffError($input, $id === 0)) {
        reply(['success' => false, 'message' => $error], 422);
    }
    if (in_array($password, ['admin123', 'staff123'], true)) {
        reply(['success' => false, 'message' => 'Choose a password other than a sample portal password.'], 422);
    }
    $current = $id ? liveQuery($db, "SELECT booking_access FROM users WHERE user_id = ? AND role = 'staff'", [$id])->fetchColumn() : null;
    if ($id && $current === false) {
        reply(['error' => 'Staff account not found.'], 404);
    }
    $access = !$signup && array_key_exists('booking_access', $input)
        ? field($input, 'booking_access') : ($current ?? 'review');
    if (!in_array($access, ['none', 'view', 'review', 'view_all', 'review_all'], true)) {
        reply(['error' => 'Choose valid booking permissions.'], 422);
    }
    try {
        if ($id) {
            $sql = 'UPDATE users SET display_name = ?, email = ?, access_status = ?, booking_access = ?';
            $params = [$name, $email, $status, $access];
            if ($password !== '') {
                $sql .= ', password_hash = ?';
                $params[] = password_hash($password, PASSWORD_DEFAULT);
            }
            $params[] = $id;
            liveQuery($db, $sql . " WHERE user_id = ? AND role = 'staff'", $params);
        } else {
            liveQuery($db, "INSERT INTO users (display_name, email, password_hash, role, access_status, booking_access)
                            VALUES (?, ?, ?, 'staff', ?, ?)",
                [$name, $email, password_hash($password, PASSWORD_DEFAULT), $status, $access]);
        }
    } catch (PDOException $error) {
        if ($error->getCode() === '23000') {
            reply(['success' => false, 'message' => 'An account already uses that email.'], 422);
        }
        throw $error;
    }
    reply(['success' => true, 'message' => $signup
        ? 'Access requested. An admin must approve your account before you can sign in.'
        : 'Staff account saved.']);
}

function eligibleAssignee(PDO $db, string $id): bool
{
    return (bool) liveQuery($db, "SELECT user_id FROM users WHERE user_id = ? AND role = 'staff'
        AND access_status = 'approved' AND booking_access IN ('view', 'review', 'view_all', 'review_all') FOR UPDATE",
        [$id])->fetchColumn();
}

function updateLiveBooking(PDO $db, array $actor, array $input): never
{
    $isAdmin = $actor['role'] === 'admin';
    if (!$isAdmin && !in_array($actor['booking_access'], ['review', 'review_all'], true)) {
        reply(['error' => 'Your account cannot update booking statuses.'], 403);
    }
    $status = field($input, 'status');
    if (!in_array($status, ['Pending', 'In review', 'Confirmed'], true)) {
        reply(['error' => 'Choose a valid booking status.'], 422);
    }
    $reference = field($input, 'reference');
    if (!preg_match('/\A[1-9][0-9]{0,19}\z/', $reference)) {
        reply(['error' => 'Booking unavailable.'], 404);
    }
    $assignee = field($input, 'assigned_to');
    $db->beginTransaction();
    try {
        $booking = liveQuery($db, 'SELECT assigned_user_id FROM order_details WHERE order_id = ? FOR UPDATE',
            [$reference])->fetch();
        if (!$booking) {
            $db->rollBack();
            reply(['error' => 'Booking unavailable.'], 404);
        }
        if (!$isAdmin) {
            // Recheck the scope while locked in case the Director changed permissions mid-request.
            $access = liveQuery($db, "SELECT booking_access FROM users WHERE user_id = ? AND role = 'staff'
                        AND access_status = 'approved' FOR UPDATE", [$actor['id']])->fetchColumn();
            if (!in_array($access, ['review', 'review_all'], true)) {
                $db->rollBack();
                reply(['error' => 'Your account cannot update booking statuses.'], 403);
            }
            if ($access === 'review' && (int) $booking['assigned_user_id'] !== $actor['id']) {
                $db->rollBack();
                reply(['error' => 'Booking unavailable.'], 404);
            }
        }
        $assignedId = $booking['assigned_user_id'];
        if ($isAdmin) {
            if ($assignee === 'Unassigned') {
                $assignedId = null;
            } elseif (!preg_match('/\A[1-9][0-9]{0,19}\z/', $assignee)
                || ($assignee !== (string) $assignedId && !eligibleAssignee($db, $assignee))) {
                $db->rollBack();
                reply(['error' => 'Choose an approved staff member with booking access.'], 422);
            } else {
                $assignedId = $assignee;
            }
        }
        liveQuery($db, 'UPDATE order_details SET order_status = ?, assigned_user_id = ? WHERE order_id = ?',
            [$status, $assignedId, $reference]);
        $db->commit();
    } catch (Throwable $error) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        throw $error;
    }
    reply(['success' => true, 'bookings' => liveBookings($db, $actor)]);
}

function assignAllBookings(PDO $db, array $actor, array $input): never
{
    $assignee = field($input, 'assigned_to');
    if (!preg_match('/\A[1-9][0-9]{0,19}\z/', $assignee)) {
        reply(['error' => 'Select a staff member to assign all bookings.'], 422);
    }
    $db->beginTransaction();
    try {
        // Match the single-booking action's lock order before checking staff access.
        liveQuery($db, 'SELECT order_id FROM order_details ORDER BY order_id FOR UPDATE')->closeCursor();
        if (!eligibleAssignee($db, $assignee)) {
            $db->rollBack();
            reply(['error' => 'Choose an approved staff member with booking access.'], 422);
        }
        $updated = liveQuery($db, 'UPDATE order_details SET assigned_user_id = ?
                                     WHERE assigned_user_id IS NULL OR assigned_user_id <> ?', [$assignee, $assignee])->rowCount();
        $db->commit();
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        throw $error;
    }
    reply(['success' => true, 'updated' => $updated, 'bookings' => liveBookings($db, $actor)]);
}

function handleLivePortal(PDO $db, string $action, array $input): never
{
    $actor = null;
    if (isset($_SESSION['live_user_id'])) {
        $user = liveQuery($db, "SELECT * FROM users
                               WHERE user_id = ? AND access_status = 'approved'
                                 AND role IN ('admin', 'director', 'staff')", [$_SESSION['live_user_id']])->fetch();
        if ($user && ($_SESSION['live_credential'] ?? '') === hash('sha256', $user['password_hash'])) {
            $actor = liveUser($user, true);
        } else {
            unset($_SESSION['live_user_id'], $_SESSION['live_credential']);
        }
    }
    $isAdmin = ($actor['role'] ?? null) === 'admin';
    if (in_array($action, ['save_staff', 'approve_staff', 'assign_all_bookings'], true) && !$isAdmin) {
        reply(['error' => 'Admin access required.'], 403);
    }
    if (in_array($action, ['dashboard_data', 'update_booking', 'update_profile', 'change_password'], true) && !$actor) {
        reply(['error' => 'Sign in to access the workspace.'], 401);
    }

    switch ($action) {
        case 'session':
            reply($actor ? ['authenticated' => true, 'user' => $actor] : ['authenticated' => false]);

        case 'login':
            $user = liveQuery($db, "SELECT * FROM users WHERE email = ? AND role IN ('admin', 'director', 'staff')",
                [strtolower(field($input, 'email'))])->fetch();
            $password = is_string($input['password'] ?? null) ? $input['password'] : '';
            if (!$user || in_array($password, ['admin123', 'staff123'], true) || !password_verify($password, $user['password_hash'])) {
                reply(['success' => false, 'message' => 'Invalid work email or password.'], 401);
            }
            if ($user['access_status'] !== 'approved') {
                reply(['success' => false, 'message' => 'Your staff account does not currently have portal access.'], 403);
            }
            session_regenerate_id(true);
            $_SESSION['live_user_id'] = $user['user_id'];
            $_SESSION['live_credential'] = hash('sha256', $user['password_hash']);
            reply(['success' => true, 'user' => liveUser($user, true)]);

        case 'update_profile':
            $changes = profileChanges($input);
            $sql = 'UPDATE users SET display_name = ?';
            $params = [$changes['name']];
            if (array_key_exists('profile_photo', $changes)) {
                if (!array_key_exists('profile_photo', $user)) {
                    reply(['error' => 'Profile photo storage needs the latest Guild Portal database setup.'], 503);
                }
                $sql .= ', profile_photo = ?';
                $params[] = $changes['profile_photo'];
            }
            $params[] = $actor['id'];
            liveQuery($db, $sql . " WHERE user_id = ? AND access_status = 'approved'", $params);
            reply(['success' => true, 'user' => array_replace($actor, $changes)]);

        case 'change_password':
            $hash = changedPasswordHash($input, $user['password_hash']);
            $updated = liveQuery($db, "UPDATE users SET password_hash = ?
                                       WHERE user_id = ? AND password_hash = ? AND access_status = 'approved'",
                [$hash, $actor['id'], $user['password_hash']]);
            if (!$updated->rowCount()) {
                reply(['error' => 'Your account changed. Sign in again and retry.'], 409);
            }
            session_regenerate_id(true);
            $_SESSION['live_credential'] = hash('sha256', $hash);
            reply(['success' => true]);

        case 'signup':
        case 'save_staff':
            saveLiveStaff($db, $input, $action === 'signup');

        case 'logout':
            $_SESSION = [];
            session_destroy();
            reply(['success' => true]);

        case 'dashboard_data':
            $users = $isAdmin ? liveQuery($db, "SELECT user_id, display_name, email, role, access_status, booking_access FROM users
                                               WHERE role = 'staff' ORDER BY display_name, user_id")->fetchAll() : [];
            reply(['user' => $actor, 'bookings' => liveBookings($db, $actor), 'users' => array_map('liveUser', $users)]);

        case 'update_booking':
            updateLiveBooking($db, $actor, $input);

        case 'assign_all_bookings':
            assignAllBookings($db, $actor, $input);

        case 'approve_staff':
            $id = (int) ($input['user_id'] ?? 0);
            $decision = field($input, 'decision');
            if (!in_array($decision, ['approved', 'rejected', 'disabled'], true)) {
                reply(['error' => 'Choose a valid access decision.'], 422);
            }
            $updated = liveQuery($db, "UPDATE users SET access_status = ? WHERE user_id = ? AND role = 'staff'", [$decision, $id]);
            if (!$updated->rowCount() && !liveQuery($db, "SELECT 1 FROM users WHERE user_id = ? AND role = 'staff'", [$id])->fetchColumn()) {
                reply(['error' => 'Staff account not found.'], 404);
            }
            reply(['success' => true]);

        default:
            reply(['error' => 'Unknown action.'], 404);
    }
}