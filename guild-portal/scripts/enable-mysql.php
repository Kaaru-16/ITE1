<?php
// Run from the command line with TEYVAT_ADMIN_PASSWORD set for this process.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$email = strtolower(trim($argv[1] ?? ''));
$name = trim($argv[2] ?? '');
$password = getenv('TEYVAT_ADMIN_PASSWORD');
if (strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)
    || $name === '' || mb_strlen($name) > 120
    || $password === false || mb_strlen($password) < 12 || strlen($password) > 72
    || str_contains($password, "\0")) {
    fwrite(STDERR, "Usage: php enable-mysql.php ADMIN_EMAIL \"DIRECTOR NAME\"\n");
    fwrite(STDERR, "Set TEYVAT_ADMIN_PASSWORD to a password of at least 12 characters and at most 72 bytes.\n");
    exit(1);
}

try {
    $configDir = dirname(__DIR__, 2) . '/config';
    require $configDir . '/db.php';
    require __DIR__ . '/../api/mysql-store.php';

    $columns = $pdo->query('SHOW COLUMNS FROM users')->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('access_status', $columns, true)) {
        $pdo->exec("ALTER TABLE users ADD access_status VARCHAR(12) NOT NULL DEFAULT 'approved'");
    }

    $account = liveQuery($pdo, 'SELECT role, password_hash, access_status FROM users WHERE email = ?', [$email])->fetch();
    if ($account) {
        if (!in_array($account['role'], ['director', 'admin'], true) || $account['access_status'] !== 'approved'
            || !password_verify($password, $account['password_hash'])) {
            fwrite(STDERR, "That email is already in use. Enter the correct Director credentials or use another email.\n");
            exit(1);
        }
    } else {
        liveQuery($pdo, "INSERT INTO users (display_name, email, password_hash, role, access_status)
                         VALUES (?, ?, ?, 'director', 'approved')",
            [$name, $email, password_hash($password, PASSWORD_DEFAULT)]);
    }

    if (!in_array('profile_photo', $columns, true)) {
        $pdo->exec('ALTER TABLE users ADD profile_photo MEDIUMTEXT NULL');
    }
    ensureBookingAccessColumn($pdo);

    echo "Guild Portal database setup is complete. Sign in with the Director account.\n";
} catch (Throwable $error) {
    fwrite(STDERR, 'Setup failed: ' . $error->getMessage() . PHP_EOL);
    exit(1);
}