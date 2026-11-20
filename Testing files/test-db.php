
<?php
try {
    require_once __DIR__ . "/../config/db.php";
    $pdo->query("SELECT 1");
    echo "Database connection successful!";
} catch (RuntimeException $e) {
    error_log($e->getMessage());
    http_response_code(503);
    echo "Database connection failed.";
}