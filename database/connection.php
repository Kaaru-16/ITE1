<?php
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    http_response_code(404);
    exit;
}

$configPath = getenv("TEYVAT_DB_CONFIG") ?: "C:/xampp/teyvat-travel/db.php";

if (!is_readable($configPath)) {
    throw new RuntimeException("The Teyvat database configuration file is missing or unreadable.");
}

$config = require $configPath;
$sslCa = defined("Pdo\\Mysql::ATTR_SSL_CA") ? Pdo\Mysql::ATTR_SSL_CA : PDO::MYSQL_ATTR_SSL_CA;
$sslVerify = defined("Pdo\\Mysql::ATTR_SSL_VERIFY_SERVER_CERT")
    ? Pdo\Mysql::ATTR_SSL_VERIFY_SERVER_CERT
    : PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT;

$pdo = new PDO(
    "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset=utf8mb4",
    $config["username"],
    $config["password"],
    [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT => 8,
        $sslCa => $config["ca"],
        $sslVerify => true,
    ]
);
