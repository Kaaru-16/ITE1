<?php
session_start();
header('Cache-Control: no-store');
header('Content-Type: application/json');

$action = field($_GET, 'action');
$input = json_decode(file_get_contents('php://input'), true);
$input = is_array($input) ? $input : [];
if (in_array($action, ['login', 'signup', 'logout', 'update_booking', 'save_staff', 'approve_staff', 'update_profile', 'change_password'], true)) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        header('Allow: POST');
        reply(['error' => 'Use POST to make this change.'], 405);
    }
    if (!isset($_SESSION['csrf']) || !hash_equals($_SESSION['csrf'], $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '')) {
        reply(['error' => 'Your session expired. Reload the page and try again.'], 403);
    }
}

$configDir = dirname(__DIR__, 2) . '/config';
if (is_file($configDir . '/portal.live')) {
    try {
        require $configDir . '/db.php';
        require __DIR__ . '/mysql-store.php';
        handleLivePortal($pdo, $action, $input);
    } catch (Throwable $error) {
        error_log('Guild Portal: ' . $error->getMessage());
        reply(['error' => 'The portal could not complete the request.'], 500);
    }
}

$dataDir = __DIR__ . '/../data';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0777, true);
}

$usersFile = $dataDir . '/users.json';
$bookingsFile = $dataDir . '/bookings.json';
$lock = fopen($dataDir . '/.portal.lock', 'c');
if (!$lock || !flock($lock, LOCK_EX)) {
    reply(['error' => 'The portal is temporarily unavailable.'], 503);
}

// Seed initial users if not present
if (!file_exists($usersFile)) {
    $initialUsers = [
        [
            'id' => 1,
            'name' => 'Guild Master (Admin)',
            'email' => 'admin@teyvat.example',
            'password' => password_hash('admin123', PASSWORD_DEFAULT),
            'role' => 'admin',
            'status' => 'approved'
        ],
        [
            'id' => 2,
            'name' => 'Jules Hart',
            'email' => 'jules@teyvat.example',
            'password' => password_hash('staff123', PASSWORD_DEFAULT),
            'role' => 'staff',
            'status' => 'approved'
        ],
        [
            'id' => 3,
            'name' => 'Ren Ash',
            'email' => 'ren@teyvat.example',
            'password' => password_hash('staff123', PASSWORD_DEFAULT),
            'role' => 'staff',
            'status' => 'approved'
        ],
        [
            'id' => 4,
            'name' => 'Lyra Vance',
            'email' => 'lyra@teyvat.example',
            'password' => password_hash('staff123', PASSWORD_DEFAULT),
            'role' => 'staff',
            'status' => 'pending'
        ]
    ];
    file_put_contents($usersFile, json_encode($initialUsers, JSON_PRETTY_PRINT));
}

// Seed initial bookings matching screenshots if not present
if (!file_exists($bookingsFile)) {
    $initialBookings = [
        [
            'reference' => 'TYV-0107',
            'traveler' => 'Mira Vale',
            'email' => 'mira.vale@example.test',
            'phone' => 'Not provided',
            'nation' => 'Mondstadt',
            'travel_date' => '2027-01-16',
            'guests' => 3,
            'rate' => 12500,
            'status' => 'Pending',
            'assigned_to' => 'Unassigned',
            'requests' => 'Vegetarian meals for one traveler.'
        ],
        [
            'reference' => 'TYV-0104',
            'traveler' => 'Tavi Moss',
            'email' => 'tavi.moss@example.test',
            'phone' => '+63 917 555 0144',
            'nation' => 'Sumeru',
            'travel_date' => '2027-01-24',
            'guests' => 5,
            'rate' => 14000,
            'status' => 'Pending',
            'assigned_to' => 'Unassigned',
            'requests' => 'Akademiya library guided tour requested.'
        ],
        [
            'reference' => 'TYV-0101',
            'traveler' => 'Nia Finch',
            'email' => 'nia.finch@example.test',
            'phone' => '+63 918 555 0199',
            'nation' => 'Snezhnaya',
            'travel_date' => '2027-02-02',
            'guests' => 6,
            'rate' => 18500,
            'status' => 'Pending',
            'assigned_to' => 'Unassigned',
            'requests' => 'Cold-weather gear rental upon arrival.'
        ],
        [
            'reference' => 'TYV-0106',
            'traveler' => 'Arin Sol',
            'email' => 'arin.sol@example.test',
            'phone' => 'Not provided',
            'nation' => 'Liyue',
            'travel_date' => '2027-01-18',
            'guests' => 4,
            'rate' => 13000,
            'status' => 'In review',
            'assigned_to' => 'Jules Hart',
            'requests' => 'Lantern Rite harbor boat reservation.'
        ],
        [
            'reference' => 'TYV-0103',
            'traveler' => 'Sora Reed',
            'email' => 'sora.reed@example.test',
            'phone' => '+63 920 555 0112',
            'nation' => 'Fontaine',
            'travel_date' => '2027-01-27',
            'guests' => 2,
            'rate' => 16000,
            'status' => 'In review',
            'assigned_to' => 'Jules Hart',
            'requests' => 'Opera Epiclese front-row seating.'
        ],
        [
            'reference' => 'TYV-0105',
            'traveler' => 'Lena Wynn',
            'email' => 'lena.wynn@example.test',
            'phone' => '+63 917 555 0188',
            'nation' => 'Inazuma',
            'travel_date' => '2027-01-21',
            'guests' => 2,
            'rate' => 15000,
            'status' => 'Confirmed',
            'assigned_to' => 'Ren Ash',
            'requests' => 'Grand Narukami Shrine morning visit.'
        ],
        [
            'reference' => 'TYV-0102',
            'traveler' => 'Ivo North',
            'email' => 'ivo.north@example.test',
            'phone' => '+63 919 555 0177',
            'nation' => 'Natlan',
            'travel_date' => '2027-01-30',
            'guests' => 4,
            'rate' => 15500,
            'status' => 'Confirmed',
            'assigned_to' => 'Ren Ash',
            'requests' => 'Hot springs resort transfer included.'
        ]
    ];
    file_put_contents($bookingsFile, json_encode($initialBookings, JSON_PRETTY_PRINT));
}

function readRecords(string $file): array
{
    return json_decode(file_get_contents($file), true, 512, JSON_THROW_ON_ERROR);
}

function writeRecords(string $file, array $records): void
{
    $temp = tempnam(dirname($file), '.portal-');
    if ($temp === false) {
        throw new RuntimeException('Could not stage the update.');
    }
    try {
        $json = json_encode($records, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR);
        if (file_put_contents($temp, $json) !== strlen($json) || !rename($temp, $file)) {
            throw new RuntimeException('Could not save the update.');
        }
    } finally {
        if (is_file($temp)) {
            unlink($temp);
        }
    }
}

function reply(array $data, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($data, JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function field(array $values, string $key): string
{
    return is_string($values[$key] ?? null) ? trim($values[$key]) : '';
}

function publicUser(array $user, bool $ownAccount = false): array
{
    $fields = array_intersect_key($user, array_flip(['id', 'name', 'email', 'role', 'status']));
    if ($ownAccount) {
        $fields['profile_photo'] = $user['profile_photo'] ?? null;
    }
    return $fields;
}

function profileChanges(array $input): array
{
    $name = field($input, 'name');
    if ($name === '' || mb_strlen($name) > 120 || strcasecmp($name, 'Unassigned') === 0 || preg_match('/\p{Cc}/u', $name)) {
        reply(['error' => 'Enter a valid display name of up to 120 characters.'], 422);
    }
    $changes = ['name' => $name];
    if (array_key_exists('profile_photo', $input)) {
        $photo = $input['profile_photo'];
        if ($photo !== null) {
            $prefix = 'data:image/jpeg;base64,';
            $bytes = is_string($photo) && strlen($photo) <= 90000 && str_starts_with($photo, $prefix)
                ? base64_decode(substr($photo, strlen($prefix)), true) : false;
            $size = $bytes ? @getimagesizefromstring($bytes) : false;
            if (!$size || $size[2] !== IMAGETYPE_JPEG || $size[0] !== 256 || $size[1] !== 256) {
                reply(['error' => 'Choose a valid profile photo and try again.'], 422);
            }
            $photo = $prefix . base64_encode($bytes);
        }
        $changes['profile_photo'] = $photo;
    }
    return $changes;
}

function changedPasswordHash(array $input, string $existingHash): string
{
    $current = $input['current_password'] ?? null;
    $next = $input['new_password'] ?? null;
    if (!is_string($current) || !password_verify($current, $existingHash)) {
        reply(['error' => 'Current password is incorrect.'], 422);
    }
    if (!is_string($next) || mb_strlen($next) < 8 || strlen($next) > 72 || str_contains($next, "\0")) {
        reply(['error' => 'Use at least 8 characters and at most 72 bytes.'], 422);
    }
    if ($next !== ($input['confirm_password'] ?? null)) {
        reply(['error' => 'The new passwords do not match.'], 422);
    }
    if (in_array($next, ['admin123', 'staff123'], true) || password_verify($next, $existingHash)) {
        reply(['error' => 'Choose a different password.'], 422);
    }
    return password_hash($next, PASSWORD_DEFAULT);
}

function staffError(array $input, array $users, int $except = 0): ?string
{
    $name = field($input, 'name');
    $email = field($input, 'email');
    $password = is_string($input['password'] ?? null) ? $input['password'] : '';
    if ($name === '' || mb_strlen($name) > 120 || strcasecmp($name, 'Unassigned') === 0
        || strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return 'Enter a valid staff name and work email.';
    }
    if (($except === 0 || $password !== '') && (mb_strlen($password) < 8 || strlen($password) > 72 || str_contains($password, "\0"))) {
        return 'Use a password of at least 8 characters and at most 72 bytes.';
    }
    foreach ($users as $user) {
        if ((int) $user['id'] !== $except && strcasecmp($user['email'], $email) === 0) {
            return 'An account already uses that email.';
        }
        // Sample bookings store assignees by name.
        foreach ([$user['name'], ...($user['assignment_names'] ?? [])] as $assignedName) {
            if ((int) $user['id'] !== $except && strcasecmp($assignedName, $name) === 0) {
                return 'That display name already exists. Use a distinct name for assignments.';
            }
        }
    }
    return null;
}

try {
    $users = readRecords($usersFile);
    $bookings = readRecords($bookingsFile);
    $renamedAssignees = [];
    foreach ($users as $user) {
        foreach ($user['assignment_names'] ?? [] as $name) {
            $renamedAssignees[$name] = $user['name'];
        }
    }
    foreach ($bookings as &$booking) {
        $booking['assigned_to'] = $renamedAssignees[$booking['assigned_to']] ?? $booking['assigned_to'];
    }
    unset($booking);
    $actor = null;
    $actorIndex = null;
    foreach ($users as $index => $user) {
        if (isset($_SESSION['user']['id']) && (int) $user['id'] === (int) $_SESSION['user']['id']
            && $user['status'] === 'approved' && ($_SESSION['user']['credential'] ?? '') === hash('sha256', $user['password'])) {
            $actor = $user;
            $actorIndex = $index;
            break;
        }
    }
    if ($actor === null) {
        unset($_SESSION['user']);
    }
    $isAdmin = ($actor['role'] ?? null) === 'admin';
    if (in_array($action, ['save_staff', 'approve_staff'], true) && !$isAdmin) {
        reply(['error' => 'Admin access required.'], 403);
    }
    if (in_array($action, ['update_profile', 'change_password'], true) && !$actor) {
        reply(['error' => 'Sign in to manage your account.'], 401);
    }

    switch ($action) {
        case 'session':
            reply($actor ? ['authenticated' => true, 'user' => publicUser($actor, true)] : ['authenticated' => false]);

        case 'login':
            $email = field($input, 'email');
            $password = is_string($input['password'] ?? null) ? $input['password'] : '';
            $local = in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true);
            if ($local || !in_array($password, ['admin123', 'staff123'], true)) {
                foreach ($users as $user) {
                    if (strcasecmp($user['email'], $email) !== 0 || !password_verify($password, $user['password'])) {
                        continue;
                    }
                    if ($user['status'] !== 'approved') {
                        reply(['success' => false, 'message' => 'Your staff account does not currently have portal access.'], 403);
                    }
                    session_regenerate_id(true);
                    $_SESSION['user'] = ['id' => $user['id'], 'credential' => hash('sha256', $user['password'])];
                    reply(['success' => true, 'user' => publicUser($user, true)]);
                }
            }
            reply(['success' => false, 'message' => 'Invalid work email or password.'], 401);

        case 'update_profile':
            $changes = profileChanges($input);
            $error = staffError(['name' => $changes['name'], 'email' => $actor['email']], $users, (int) $actor['id']);
            if ($error) {
                reply(['error' => $error], 422);
            }
            if ($changes['name'] !== $actor['name']) {
                $changes['assignment_names'] = array_values(array_unique([...($actor['assignment_names'] ?? []), $actor['name']]));
            }
            $users[$actorIndex] = array_replace($actor, $changes);
            writeRecords($usersFile, $users);
            reply(['success' => true, 'user' => publicUser($users[$actorIndex], true)]);

        case 'change_password':
            $hash = changedPasswordHash($input, $actor['password']);
            $users[$actorIndex]['password'] = $hash;
            writeRecords($usersFile, $users);
            session_regenerate_id(true);
            $_SESSION['user']['credential'] = hash('sha256', $hash);
            reply(['success' => true]);

        case 'signup':
        case 'save_staff':
            $id = $action === 'save_staff' ? (int) ($input['user_id'] ?? 0) : 0;
            $existing = null;
            if ($id !== 0) {
                foreach ($users as $key => $user) {
                    if ((int) $user['id'] === $id && $user['role'] === 'staff') {
                        $existing = $key;
                        break;
                    }
                }
                if ($existing === null) {
                    reply(['error' => 'Staff account not found.'], 404);
                }
            }
            if ($error = staffError($input, $users, $id)) {
                reply(['success' => false, 'message' => $error], 422);
            }
            $status = $action === 'signup' ? 'pending' : field($input, 'status');
            if (!in_array($status, ['pending', 'approved', 'rejected', 'disabled'], true)) {
                reply(['error' => 'Choose a valid access status.'], 422);
            }
            $old = $existing === null ? null : $users[$existing];
            $name = field($input, 'name');
            $password = is_string($input['password'] ?? null) ? $input['password'] : '';
            $nextId = $id ?: max([0, ...array_column($users, 'id')]) + 1;
            $user = [
                'id' => $nextId, 'name' => $name, 'email' => strtolower(field($input, 'email')),
                'password' => $password !== '' ? password_hash($password, PASSWORD_DEFAULT) : $old['password'],
                'role' => 'staff', 'status' => $status,
            ];
            if ($old) {
                // Preserve links to existing bookings with a single atomic account update.
                $user['assignment_names'] = array_values(array_unique([...($old['assignment_names'] ?? []), $old['name']]));
                $user['profile_photo'] = $old['profile_photo'] ?? null;
            }
            $users[$existing ?? count($users)] = $user;
            writeRecords($usersFile, $users);
            reply(['success' => true, 'message' => $action === 'signup'
                ? 'Access requested. An admin must approve your account before you can sign in.'
                : 'Staff account saved.']);

        case 'logout':
            $_SESSION = [];
            session_destroy();
            reply(['success' => true]);

        case 'dashboard_data':
            if (!$actor) {
                reply(['error' => 'Sign in to view the workspace.'], 401);
            }
            $visible = $isAdmin ? $bookings : array_values(array_filter($bookings, static fn ($b) => $b['assigned_to'] === $actor['name']));
            reply(['user' => publicUser($actor, true), 'bookings' => $visible, 'users' => $isAdmin ? array_map('publicUser', $users) : []]);

        case 'update_booking':
            if (!$actor) {
                reply(['error' => 'Sign in to update bookings.'], 401);
            }
            $status = field($input, 'status');
            if (!in_array($status, ['Pending', 'In review', 'Confirmed'], true)) {
                reply(['error' => 'Choose a valid booking status.'], 422);
            }
            $reference = field($input, 'reference');
            foreach ($bookings as $i => $booking) {
                if ($booking['reference'] !== $reference || (!$isAdmin && $booking['assigned_to'] !== $actor['name'])) {
                    continue;
                }
                $assignee = $isAdmin ? field($input, 'assigned_to') : $booking['assigned_to'];
                if ($assignee !== 'Unassigned' && $assignee !== $booking['assigned_to']) {
                    $eligible = array_filter($users, static fn ($user) =>
                        $user['name'] === $assignee && $user['role'] === 'staff' && $user['status'] === 'approved');
                    if (!$eligible) {
                        reply(['error' => 'Choose a staff member with approved access.'], 422);
                    }
                }
                $bookings[$i]['status'] = $status;
                $bookings[$i]['assigned_to'] = $assignee;
                writeRecords($bookingsFile, $bookings);
                $visible = $isAdmin ? $bookings : array_values(array_filter($bookings, static fn ($b) => $b['assigned_to'] === $actor['name']));
                reply(['success' => true, 'bookings' => $visible]);
            }
            reply(['error' => 'Booking unavailable.'], 404);

        case 'approve_staff':
            $id = (int) ($input['user_id'] ?? 0);
            $decision = field($input, 'decision');
            if (!in_array($decision, ['approved', 'rejected', 'disabled'], true)) {
                reply(['error' => 'Choose a valid access decision.'], 422);
            }
            foreach ($users as $i => $user) {
                if ((int) $user['id'] === $id && $user['role'] === 'staff') {
                    $users[$i]['status'] = $decision;
                    writeRecords($usersFile, $users);
                    reply(['success' => true]);
                }
            }
            reply(['error' => 'Staff account not found.'], 404);

        default:
            reply(['error' => 'Unknown action.'], 404);
    }
} catch (Throwable $error) {
    error_log('Guild Portal: ' . $error->getMessage());
    reply(['error' => 'The portal could not complete the request.'], 500);
}
