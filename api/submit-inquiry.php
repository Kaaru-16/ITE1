<?php

header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed."]);
    exit;
}

require_once __DIR__ . "/../config/db.php";

$data = json_decode(file_get_contents("php://input"), true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid request."]);
    exit;
}

// Package mapping
$packages = [
    "mondstadt" => "Mondstadt",
    "liyue" => "Liyue",
    "inazuma" => "Inazuma",
    "sumeru" => "Sumeru",
    "fontaine" => "Fontaine",
    "natlan" => "Natlan",
    "snezhnaya" => "Snezhnaya"
];

$name = trim($data["traveler"] ?? "");
$email = trim($data["email"] ?? "");
$phone = trim($data["phone"] ?? "");
$packageKey = $data["package"] ?? "";
$travelDate = $data["date"] ?? "";
$travelers = filter_var(
    $data["travelers"] ?? null,
    FILTER_VALIDATE_INT
);
$requests = trim($data["requests"] ?? "");

if (
    $name === "" ||
    strlen($name) > 120 ||
    !filter_var($email, FILTER_VALIDATE_EMAIL) ||
    strlen($email) > 254 ||
    !isset($packages[$packageKey]) ||
    !$travelers ||
    $travelers < 1 ||
    $travelers > 1000000 ||
    strlen($phone) > 32 ||
    strlen($requests) > 65535
) {
    http_response_code(422);
    echo json_encode([
        "success" => false,
        "message" => "Please check your booking information."
    ]);
    exit;
}

// Validate date
$date = DateTime::createFromFormat("!Y-m-d", $travelDate);

if (
    !$date ||
    $date->format("Y-m-d") !== $travelDate ||
    $travelDate < date("Y-m-d")
) {
    http_response_code(422);
    echo json_encode([
        "success" => false,
        "message" => "Please select a valid travel date."
    ]);
    exit;
}

try {
    $packageStmt = $pdo->prepare(
        "SELECT package_id FROM packages WHERE package_name = :package_name"
    );
    $packageStmt->execute([":package_name" => $packages[$packageKey]]);
    $packageId = $packageStmt->fetchColumn();

    if ($packageId === false) {
        throw new PDOException("Package is missing from the database: " . $packages[$packageKey]);
    }

    $pdo->beginTransaction();

    $customerStmt = $pdo->prepare(
        "INSERT INTO customer_data (customer_name, customer_email, customer_cell)
        VALUES (:customer_name, :customer_email, :customer_cell)"
    );
    $customerStmt->execute([
        ":customer_name" => $name,
        ":customer_email" => $email,
        ":customer_cell" => $phone ?: null
    ]);
    $customerId = $pdo->lastInsertId();

    $orderStmt = $pdo->prepare(
        "INSERT INTO order_details (
            customer_id,
            package_id,
            pax_number,
            travel_date,
            order_status,
            order_req
        ) VALUES (
            :customer_id,
            :package_id,
            :pax_number,
            :travel_date,
            :order_status,
            :order_req
        )"
    );
    $orderStmt->execute([
        ":customer_id" => $customerId,
        ":package_id" => $packageId,
        ":pax_number" => $travelers,
        ":travel_date" => $travelDate,
        ":order_status" => "Pending",
        ":order_req" => $requests ?: null
    ]);

    $orderId = $pdo->lastInsertId();
    $pdo->commit();

    echo json_encode([
        "success" => true,
        "message" => "Your booking inquiry has been saved!",
        "id" => $orderId
    ]);

} catch (PDOException $e) {

    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log($e->getMessage());

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Unable to save your inquiry. Please try again."
    ]);
}
