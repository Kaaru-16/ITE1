<?php

header("Content-Type: application/json; charset=UTF-8");

function inquiryResponse(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body);
    exit;
}

function mobileNumberError(string $phone): ?string
{
    if ($phone === "") return null;

    // The browser uses the same calling codes, lengths, and mobile prefixes.
    $rulesPath = __DIR__ . "/../data/phone-lengths.json";
    $metadata = is_readable($rulesPath) ? json_decode(file_get_contents($rulesPath), true) : null;
    if (empty($metadata["callingCodes"])) {
        inquiryResponse(500, ["success" => false, "message" => "Phone number validation is temporarily unavailable."]);
    }

    $invalid = "Enter a valid mobile number for this calling code.";
    if (!preg_match('/\A\+([1-9][0-9]+)\z/', $phone, $matches)) return $invalid;

    $digits = $matches[1];
    for ($prefixLength = 1; $prefixLength <= 3; $prefixLength++) {
        $rule = $metadata["callingCodes"][substr($digits, 0, $prefixLength)] ?? null;
        if (!$rule) continue;

        $nationalNumber = substr($digits, $prefixLength);
        $lengths = $rule["lengths"];
        $length = strlen($nationalNumber);
        $maximum = max($lengths);
        if ($length > $maximum) return "Enter up to $maximum digits.";
        if (!in_array($length, $lengths, true)) {
            return count($lengths) === 1
                ? "Enter exactly $maximum digits."
                : "Allowed digit counts are " . implode(", ", $lengths) . ".";
        }
        return preg_match('/\A(?:' . $rule["pattern"] . ')\z/', $nationalNumber) === 1 ? null : $invalid;
    }
    return $invalid;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    header("Allow: POST");
    inquiryResponse(405, ["success" => false, "message" => "Method not allowed."]);
}

$data = json_decode(file_get_contents("php://input"), true);

if (!is_array($data)) {
    inquiryResponse(400, ["success" => false, "message" => "Invalid request."]);
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
$phoneError = is_string($phone) ? mobileNumberError(trim($phone)) : "Enter a valid phone number.";
if ($phoneError !== null) {
    $errors["phone"] = $phoneError;
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
    inquiryResponse(422, [
        "success" => false,
        "message" => "Please check your booking information.",
        "errors" => $errors
    ]);
}

try {
    require_once __DIR__ . "/../../config/db.php";

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

    inquiryResponse(200, [
        "success" => true,
        "message" => "Your booking inquiry has been saved!",
        "id" => $orderId
    ]);

} catch (RuntimeException $e) {

    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log($e->getMessage());

    inquiryResponse(500, [
        "success" => false,
        "message" => "Unable to save your inquiry. Please try again."
    ]);
}
