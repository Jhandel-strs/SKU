<?php
/**
 * SKU Inventory Tracker - API Endpoints
 * Authentication & Activity Management
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'config.php';

// Get the request path
$request_uri = trim($_SERVER['REQUEST_URI'], '/');
$parts = explode('/', $request_uri);
$endpoint = end($parts);

// Determine action from query parameters or POST data
$action = isset($_GET['action']) ? $_GET['action'] : (isset($_POST['action']) ? $_POST['action'] : '');

try {
    switch ($action) {
        case 'register':
            handleRegister($conn);
            break;
        case 'login':
            handleLogin($conn);
            break;
        case 'get-activities':
            getActivities($conn);
            break;
        case 'log-activity':
            logActivity($conn);
            break;
        case 'get-all-activities':
            getAllActivities($conn);
            break;
        case 'update-password':
            updatePassword($conn);
            break;
        case 'set-passcode':
            setPasscode($conn);
            break;
        case 'forgot-password':
            forgotPassword($conn);
            break;
        default:
            http_response_code(400);
            echo json_encode(['error' => 'Invalid action']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

/**
 * Handle User Registration
 */
function handleRegister($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $name = trim($data['name'] ?? '');
    $email = trim($data['email'] ?? '');
    $team = trim($data['team'] ?? '');
    $role = trim($data['role'] ?? '');
    $password = $data['password'] ?? '';
    
    // Validation
    if (!$name || !$email || !$team || !$role || !$password) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required fields']);
        return;
    }
    
    if (strlen($password) < 6) {
        http_response_code(400);
        echo json_encode(['error' => 'Password must be at least 6 characters']);
        return;
    }
    
    // Check if email exists
    $check_email = $conn->prepare("SELECT id FROM users WHERE email = ?");
    $check_email->bind_param("s", $email);
    $check_email->execute();
    $result = $check_email->get_result();
    
    if ($result->num_rows > 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Email already registered']);
        $check_email->close();
        return;
    }
    $check_email->close();
    
    // Hash password
    $hashed_password = password_hash($password, PASSWORD_BCRYPT);
    
    // Insert user
    $insert = $conn->prepare("
        INSERT INTO users (name, email, team, role, password) 
        VALUES (?, ?, ?, ?, ?)
    ");
    $insert->bind_param("sssss", $name, $email, $team, $role, $hashed_password);
    
    if ($insert->execute()) {
        $user_id = $insert->insert_id;
        $insert->close();
        
        // Log activity
        $activity_insert = $conn->prepare("
            INSERT INTO user_activities (user_id, activity_type, description) 
            VALUES (?, ?, ?)
        ");
        $activity_type = 'registration';
        $description = $name . ' registered as ' . $role;
        $activity_insert->bind_param("iss", $user_id, $activity_type, $description);
        $activity_insert->execute();
        $activity_insert->close();
        
        http_response_code(201);
        echo json_encode([
            'message' => 'User registered successfully',
            'user' => [
                'id' => $user_id,
                'name' => $name,
                'email' => $email,
                'team' => $team,
                'role' => $role
            ]
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Registration failed: ' . $conn->error]);
        $insert->close();
    }
}

/**
 * Handle User Login
 */
function handleLogin($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $email = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';
    
    if (!$email || !$password) {
        http_response_code(400);
        echo json_encode(['error' => 'Email and password required']);
        return;
    }
    
    // Get user
    $query = $conn->prepare("SELECT id, name, email, team, role, password FROM users WHERE email = ?");
    $query->bind_param("s", $email);
    $query->execute();
    $result = $query->get_result();
    
    if ($result->num_rows === 0) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid email or password']);
        $query->close();
        return;
    }
    
    $user = $result->fetch_assoc();
    $query->close();
    
    // Verify password
    if (!password_verify($password, $user['password'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid email or password']);
        return;
    }
    
    // Create token (simple base64 encoding - use JWT in production)
    $token = base64_encode($user['id'] . ':' . $email);
    
    // Log activity
    $activity_insert = $conn->prepare("
        INSERT INTO user_activities (user_id, activity_type, description) 
        VALUES (?, ?, ?)
    ");
    $activity_type = 'login';
    $description = $user['name'] . ' logged in';
    $activity_insert->bind_param("iss", $user['id'], $activity_type, $description);
    $activity_insert->execute();
    $activity_insert->close();
    
    echo json_encode([
        'message' => 'Login successful',
        'token' => $token,
        'user' => [
            'id' => $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'team' => $user['team'],
            'role' => $user['role']
        ]
    ]);
}

/**
 * Get User Activities
 */
function getActivities($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    $user_id = $data['user_id'] ?? 0;
    
    if (!$user_id) {
        http_response_code(400);
        echo json_encode(['error' => 'User ID required']);
        return;
    }
    
    $query = $conn->prepare("
        SELECT id, user_id, activity_type, description, created_at 
        FROM user_activities 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT 50
    ");
    $query->bind_param("i", $user_id);
    $query->execute();
    $result = $query->get_result();
    
    $activities = [];
    while ($row = $result->fetch_assoc()) {
        $activities[] = $row;
    }
    $query->close();
    
    echo json_encode($activities);
}

/**
 * Log User Activity
 */
function logActivity($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $user_id = $data['user_id'] ?? 0;
    $activity_type = trim($data['activity_type'] ?? '');
    $description = trim($data['description'] ?? '');
    
    if (!$user_id || !$activity_type || !$description) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required fields']);
        return;
    }
    
    $insert = $conn->prepare("
        INSERT INTO user_activities (user_id, activity_type, description) 
        VALUES (?, ?, ?)
    ");
    $insert->bind_param("iss", $user_id, $activity_type, $description);
    
    if ($insert->execute()) {
        http_response_code(201);
        echo json_encode([
            'id' => $insert->insert_id,
            'user_id' => $user_id,
            'activity_type' => $activity_type,
            'description' => $description,
            'created_at' => date('Y-m-d H:i:s')
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to log activity: ' . $conn->error]);
    }
    $insert->close();
}

/**
 * Get All Activities (Admin)
 */
function getAllActivities($conn) {
    $query = $conn->prepare("
        SELECT ua.id, ua.user_id, u.name, u.email, ua.activity_type, ua.description, ua.created_at 
        FROM user_activities ua
        JOIN users u ON ua.user_id = u.id
        ORDER BY ua.created_at DESC 
        LIMIT 100
    ");
    $query->execute();
    $result = $query->get_result();
    
    $activities = [];
    while ($row = $result->fetch_assoc()) {
        $activities[] = $row;
    }
    $query->close();
    
    echo json_encode($activities);
}

/**
 * Update User Password
 */
function updatePassword($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $user_id = $data['user_id'] ?? 0;
    $current_password = $data['current_password'] ?? '';
    $new_password = $data['new_password'] ?? '';
    
    if (!$user_id || !$current_password || !$new_password) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required fields']);
        return;
    }
    
    // Get user
    $query = $conn->prepare("SELECT password FROM users WHERE id = ?");
    $query->bind_param("i", $user_id);
    $query->execute();
    $result = $query->get_result();
    
    if ($result->num_rows === 0) {
        http_response_code(401);
        echo json_encode(['error' => 'User not found']);
        $query->close();
        return;
    }
    
    $user = $result->fetch_assoc();
    $query->close();
    
    // Verify current password
    if (!password_verify($current_password, $user['password'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Current password is incorrect']);
        return;
    }
    
    // Hash new password
    $hashed_password = password_hash($new_password, PASSWORD_BCRYPT);
    
    // Update password
    $update = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
    $update->bind_param("si", $hashed_password, $user_id);
    
    if ($update->execute()) {
        // Log activity
        $activity_insert = $conn->prepare("
            INSERT INTO user_activities (user_id, activity_type, description) 
            VALUES (?, ?, ?)
        ");
        $activity_type = 'password_change';
        $description = 'Changed password';
        $activity_insert->bind_param("iss", $user_id, $activity_type, $description);
        $activity_insert->execute();
        $activity_insert->close();
        
        http_response_code(200);
        echo json_encode(['message' => 'Password updated successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update password: ' . $conn->error]);
    }
    $update->close();
}

/**
 * Set User Passcode
 */
function setPasscode($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $user_id = $data['user_id'] ?? 0;
    $passcode = $data['passcode'] ?? '';
    
    if (!$user_id || !$passcode) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required fields']);
        return;
    }
    
    if (!preg_match('/^\d{4}$/', $passcode)) {
        http_response_code(400);
        echo json_encode(['error' => 'Passcode must be exactly 4 digits']);
        return;
    }
    
    // Update passcode
    $update = $conn->prepare("UPDATE users SET passcode = ? WHERE id = ?");
    $update->bind_param("si", $passcode, $user_id);
    
    if ($update->execute()) {
        // Log activity
        $activity_insert = $conn->prepare("
            INSERT INTO user_activities (user_id, activity_type, description) 
            VALUES (?, ?, ?)
        ");
        $activity_type = 'passcode_set';
        $description = 'Set login passcode';
        $activity_insert->bind_param("iss", $user_id, $activity_type, $description);
        $activity_insert->execute();
        $activity_insert->close();
        
        http_response_code(200);
        echo json_encode(['message' => 'Passcode set successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to set passcode: ' . $conn->error]);
    }
    $update->close();
}

/**
 * Handle Forgot Password
 */
function forgotPassword($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $email = trim($data['email'] ?? '');
    
    if (!$email) {
        http_response_code(400);
        echo json_encode(['error' => 'Email required']);
        return;
    }
    
    // Check if user exists
    $query = $conn->prepare("SELECT id, name FROM users WHERE email = ?");
    $query->bind_param("s", $email);
    $query->execute();
    $result = $query->get_result();
    
    if ($result->num_rows === 0) {
        // Don't reveal if email exists for security
        http_response_code(200);
        echo json_encode(['message' => 'If email exists, password reset link will be sent']);
        $query->close();
        return;
    }
    
    $user = $result->fetch_assoc();
    $query->close();
    
    // Generate temporary password
    $temp_password = bin2hex(random_bytes(4));
    $hashed_password = password_hash($temp_password, PASSWORD_BCRYPT);
    
    // Update password
    $update = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
    $update->bind_param("si", $hashed_password, $user['id']);
    
    if ($update->execute()) {
        // Log activity
        $activity_insert = $conn->prepare("
            INSERT INTO user_activities (user_id, activity_type, description) 
            VALUES (?, ?, ?)
        ");
        $user_id = $user['id'];
        $activity_type = 'password_reset';
        $description = 'Password reset requested';
        $activity_insert->bind_param("iss", $user_id, $activity_type, $description);
        $activity_insert->execute();
        $activity_insert->close();
        
        // In production, send email here with reset link
        // For now, return the temp password (NOT SECURE - email only in production)
        http_response_code(200);
        echo json_encode([
            'message' => 'Password reset email sent. Check your inbox.',
            'temp_password' => $temp_password  // Remove in production - only for testing
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to process request']);
    }
    $update->close();
}

?>
