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

// Available packages and their official prices
$packages = [
    "mondstadt" => ["name" => "Mondstadt", "rate" => 12500],
    "liyue" => ["name" => "Liyue", "rate" => 15000],
    "inazuma" => ["name" => "Inazuma", "rate" => 18000],
    "sumeru" => ["name" => "Sumeru", "rate" => 14000],
    "fontaine" => ["name" => "Fontaine", "rate" => 20000],
    "natlan" => ["name" => "Natlan", "rate" => 14800],
    "snezhnaya" => ["name" => "Snezhnaya", "rate" => 22000]
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

$package = $packages[$packageKey];
$rate = $package["rate"];
$total = $rate * $travelers;

if (!is_int($total) || $total > PHP_INT_MAX) {
    http_response_code(422);
    echo json_encode([
        "success" => false,
        "message" => "Invalid booking total."
    ]);
    exit;
}

try {

    $sql = "INSERT INTO booking_inquiries (
        traveler_name,
        email,
        phone,
        package_key,
        package_name,
        travel_date,
        traveler_count,
        rate_per_person,
        estimated_total,
        special_requests
    ) VALUES (
        :traveler_name,
        :email,
        :phone,
        :package_key,
        :package_name,
        :travel_date,
        :traveler_count,
        :rate_per_person,
        :estimated_total,
        :special_requests
    )";

    $stmt = $pdo->prepare($sql);

    $stmt->execute([
        ":traveler_name" => $name,
        ":email" => $email,
        ":phone" => $phone ?: null,
        ":package_key" => $packageKey,
        ":package_name" => $package["name"],
        ":travel_date" => $travelDate,
        ":traveler_count" => $travelers,
        ":rate_per_person" => $rate,
        ":estimated_total" => $total,
        ":special_requests" => $requests ?: null
    ]);

    echo json_encode([
        "success" => true,
        "message" => "Your booking inquiry has been saved!",
        "id" => $pdo->lastInsertId()
    ]);

} catch (PDOException $e) {

    error_log($e->getMessage());

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Unable to save your inquiry. Please try again."
    ]);
}
