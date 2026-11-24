
<?php
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

try {
    require_once dirname(__DIR__) . '/connection.php';
    $pdo->query("SELECT 1");
    echo "Database connection successful!\n";
} catch (RuntimeException $e) {
    error_log($e->getMessage());
    fwrite(STDERR, "Database connection failed.\n");
    exit(1);
}
