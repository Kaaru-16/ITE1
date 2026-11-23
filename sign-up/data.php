<?php
session_start();
header('Content-Type: application/json');

$dataDir = __DIR__ . '/data';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0777, true);
}

$usersFile = $dataDir . '/users.json';
$bookingsFile = $dataDir . '/bookings.json';

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

$users = json_decode(file_get_contents($usersFile), true);
$bookings = json_decode(file_get_contents($bookingsFile), true);

$action = $_GET['action'] ?? '';
$input = json_decode(file_get_contents('php://input'), true) ?? [];

switch ($action) {
    case 'session':
        if (isset($_SESSION['user'])) {
            echo json_encode(['authenticated' => true, 'user' => $_SESSION['user']]);
        } else {
            echo json_encode(['authenticated' => false]);
        }
        break;

    case 'login':
        $email = strtolower(trim($input['email'] ?? ''));
        $password = $input['password'] ?? '';

        foreach ($users as $u) {
            if (strtolower($u['email']) === $email && password_verify($password, $u['password'])) {
                if ($u['status'] !== 'approved') {
                    echo json_encode(['success' => false, 'message' => 'Your staff account is pending Admin confirmation.']);
                    exit;
                }
                $_SESSION['user'] = [
                    'id' => $u['id'],
                    'name' => $u['name'],
                    'email' => $u['email'],
                    'role' => $u['role']
                ];
                echo json_encode(['success' => true, 'user' => $_SESSION['user']]);
                exit;
            }
        }
        echo json_encode(['success' => false, 'message' => 'Invalid work email or password.']);
        break;

    case 'signup':
        $name = trim($input['name'] ?? '');
        $email = strtolower(trim($input['email'] ?? ''));
        $password = $input['password'] ?? '';

        if (!$name || !$email || !$password) {
            echo json_encode(['success' => false, 'message' => 'Please fill in all fields.']);
            exit;
        }

        foreach ($users as $u) {
            if (strtolower($u['email']) === $email) {
                echo json_encode(['success' => false, 'message' => 'An account with this email already exists.']);
                exit;
            }
        }

        $newUser = [
            'id' => count($users) + 1,
            'name' => $name,
            'email' => $email,
            'password' => password_hash($password, PASSWORD_DEFAULT),
            'role' => 'staff',
            'status' => 'pending'
        ];
        $users[] = $newUser;
        file_put_contents($usersFile, json_encode($users, JSON_PRETTY_PRINT));

        echo json_encode([
            'success' => true,
            'message' => 'Account created! Please wait for an Admin to confirm your staff account before signing in.'
        ]);
        break;

    case 'logout':
        session_destroy();
        echo json_encode(['success' => true]);
        break;

    case 'dashboard_data':
        if (!isset($_SESSION['user'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            exit;
        }

        $safeUsers = array_map(function ($u) {
            return [
                'id' => $u['id'],
                'name' => $u['name'],
                'email' => $u['email'],
                'role' => $u['role'],
                'status' => $u['status']
            ];
        }, $users);

        echo json_encode([
            'user' => $_SESSION['user'],
            'bookings' => $bookings,
            'users' => $safeUsers
        ]);
        break;

    case 'update_booking':
        if (!isset($_SESSION['user'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            exit;
        }

        $ref = $input['reference'] ?? '';
        $status = $input['status'] ?? 'Pending';
        $assignedTo = $input['assigned_to'] ?? 'Unassigned';

        foreach ($bookings as &$b) {
            if ($b['reference'] === $ref) {
                $b['status'] = $status;
                $b['assigned_to'] = $assignedTo;
                break;
            }
        }
        file_put_contents($bookingsFile, json_encode($bookings, JSON_PRETTY_PRINT));
        echo json_encode(['success' => true, 'bookings' => $bookings]);
        break;

    case 'approve_staff':
        if (!isset($_SESSION['user']) || $_SESSION['user']['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode(['error' => 'Admin access required']);
            exit;
        }

        $userId = (int)($input['user_id'] ?? 0);
        $decision = $input['decision'] ?? 'approved'; // approved or rejected

        foreach ($users as &$u) {
            if ($u['id'] === $userId && $u['role'] === 'staff') {
                $u['status'] = $decision;
                break;
            }
        }
        file_put_contents($usersFile, json_encode($users, JSON_PRETTY_PRINT));
        echo json_encode(['success' => true]);
        break;

    default:
        echo json_encode(['error' => 'Invalid action']);
}