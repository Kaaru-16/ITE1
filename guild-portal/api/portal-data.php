<?php
session_start();
header('Cache-Control: no-store');
header('Content-Type: application/json');

$action = field($_GET, 'action');
$input = json_decode(file_get_contents('php://input'), true);
$input = is_array($input) ? $input : [];
if (in_array($action, ['login', 'signup', 'logout', 'update_booking', 'assign_all_bookings', 'save_staff', 'approve_staff', 'update_profile', 'change_password'], true)) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        header('Allow: POST');
        reply(['error' => 'Use POST to make this change.'], 405);
    }
    if (!isset($_SESSION['csrf']) || !hash_equals($_SESSION['csrf'], $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '')) {
        reply(['error' => 'Your session expired. Reload the page and try again.'], 403);
    }
}

try {
    require dirname(__DIR__, 2) . '/config/db.php';
    require __DIR__ . '/mysql-store.php';
    handleLivePortal($pdo, $action, $input);
} catch (Throwable $error) {
    error_log('Guild Portal: ' . $error->getMessage());
    reply(['error' => 'The portal could not complete the request.'], 500);
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
    $fields = array_intersect_key($user, array_flip(['id', 'name', 'email', 'role', 'status', 'booking_access']));
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

function staffError(array $input, bool $passwordRequired): ?string
{
    $name = field($input, 'name');
    $email = field($input, 'email');
    $password = is_string($input['password'] ?? null) ? $input['password'] : '';
    if ($name === '' || mb_strlen($name) > 120 || strcasecmp($name, 'Unassigned') === 0
        || strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return 'Enter a valid staff name and work email.';
    }
    if (($passwordRequired || $password !== '') && (mb_strlen($password) < 8 || strlen($password) > 72 || str_contains($password, "\0"))) {
        return 'Use a password of at least 8 characters and at most 72 bytes.';
    }
    return null;
}