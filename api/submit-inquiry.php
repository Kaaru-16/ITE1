<?php

header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed."]);
    exit;
}

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

$name = $data["traveler"] ?? "";
$email = $data["email"] ?? "";
$phone = $data["phone"] ?? "";
$packageKey = $data["package"] ?? "";
$travelDate = $data["date"] ?? "";
$travelers = filter_var(
    $data["travelers"] ?? null,
    FILTER_VALIDATE_INT
);
$requests = $data["requests"] ?? "";

$errors = [];
if (!is_string($name) || trim($name) === "") {
    $errors["traveler"] = "Enter the lead traveler's name.";
} elseif (preg_match('/\p{N}/u', $name)) {
    $errors["traveler"] = "Enter a name without numbers.";
} elseif (strlen(trim($name)) > 120) {
    $errors["traveler"] = "Enter a shorter name.";
}
if (!is_string($email) || !filter_var(trim($email), FILTER_VALIDATE_EMAIL) || strlen(trim($email)) > 254) {
    $errors["email"] = "Enter a valid email address.";
} else {
    $emailDomain = substr(strrchr(trim($email), "@"), 1);
    // Keep this domain check in sync with the booking form.
    if (preg_match('/(?:^|\.)(?:edu(?:\.[a-z]{2})?|(?:ac|sch)\.[a-z]{2}|k12\.[a-z]{2}\.us|school|deped\.gov\.ph)$/iD', $emailDomain)) {
        $errors["email"] = "Use a personal email address. School email addresses are not accepted.";
    }
}
if (!is_string($phone)) {
    $errors["phone"] = "Enter a valid phone number.";
} elseif (trim($phone) !== "") {
    $phone = trim($phone);
    $rulesPath = __DIR__ . "/../data/phone-lengths.json";
    $rules = is_readable($rulesPath) ? json_decode(file_get_contents($rulesPath), true) : null;
    if (empty($rules["callingCodes"])) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Phone number validation is temporarily unavailable."]);
        exit;
    }
    $digits = substr($phone, 1);
    $validPhone = false;
    if (preg_match('/^\+[1-9][0-9]+$/D', $phone)) {
        for ($prefixLength = 1; $prefixLength <= 3; $prefixLength++) {
            $callingCode = substr($digits, 0, $prefixLength);
            $lengths = $rules["callingCodes"][$callingCode] ?? null;
            if ($lengths === null) continue;
            $nationalNumber = substr($digits, $prefixLength);
            $validPhone = in_array(strlen($nationalNumber), $lengths, true)
                && ($callingCode !== "63" || !str_starts_with($nationalNumber, "0"));
            break;
        }
    }
    if (!$validPhone) {
        $errors["phone"] = "Check the calling code and the number of digits.";
    }
}
if (!is_string($packageKey) || !isset($packages[$packageKey])) {
    $errors["package"] = "Select a valid package.";
}
if ($travelers === false || $travelers < 1 || $travelers > 1000000) {
    $errors["travelers"] = "Enter a whole number of travelers between 1 and 1,000,000.";
}
if (!is_string($requests) || strlen(trim($requests)) > 65535) {
    $errors["requests"] = "Shorten your special requests.";
}

$date = is_string($travelDate) && preg_match('/^\d{4}-\d{2}-\d{2}$/D', $travelDate)
    ? DateTime::createFromFormat("!Y-m-d", $travelDate)
    : false;
if (!$date || $date->format("Y-m-d") !== $travelDate || $travelDate < date("Y-m-d")) {
    $errors["date"] = "Choose today or a later date.";
}

if ($errors) {
    http_response_code(422);
    echo json_encode([
        "success" => false,
        "message" => "Please check your booking information.",
        "errors" => $errors
    ]);
    exit;
}

try {
    require_once __DIR__ . "/../config/db.php";

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
        ":customer_name" => trim($name),
        ":customer_email" => trim($email),
        ":customer_cell" => trim($phone) ?: null
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
        ":order_req" => trim($requests) ?: null
    ]);

    $orderId = $pdo->lastInsertId();
    $pdo->commit();

    echo json_encode([
        "success" => true,
        "message" => "Your booking inquiry has been saved!",
        "id" => $orderId
    ]);

} catch (RuntimeException $e) {

    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log($e->getMessage());

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Unable to save your inquiry. Please try again."
    ]);
}