<?php
/**
 * SKU Inventory Tracker - Database Configuration
 * For XAMPP MySQL Setup
 */

// Database credentials
define('DB_HOST', 'localhost');
define('DB_USER', 'root');          // XAMPP default user
define('DB_PASSWORD', '');          // XAMPP default password (empty)
define('DB_NAME', 'sku_inventory'); // Database name

// Create connection
$conn = new mysqli(DB_HOST, DB_USER, DB_PASSWORD);

// Check connection
if ($conn->connect_error) {
    die(json_encode(['error' => 'Connection failed: ' . $conn->connect_error]));
}

// Create database if it doesn't exist
$create_db_sql = "CREATE DATABASE IF NOT EXISTS " . DB_NAME;
if (!$conn->query($create_db_sql)) {
    die(json_encode(['error' => 'Error creating database: ' . $conn->error]));
}

// Select the database
$conn->select_db(DB_NAME);

// Create tables if they don't exist
$create_tables_sql = "

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    team VARCHAR(100),
    role VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- SKU Items Table
CREATE TABLE IF NOT EXISTS sku_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    barcode VARCHAR(100),
    price_per_case DECIMAL(10, 2),
    cases_ordered INT DEFAULT 0,
    counts_per_case INT DEFAULT 0,
    total_quantity INT DEFAULT 0,
    unit VARCHAR(20),
    total_oz_pc DECIMAL(10, 2),
    servings_needed INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(50),
    user_id INT,
    action_type VARCHAR(50),
    quantity_changed INT,
    note VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- User Activities Table
CREATE TABLE IF NOT EXISTS user_activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    activity_type VARCHAR(50),
    description VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Inventory Movements Table
CREATE TABLE IF NOT EXISTS inventory_movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(50),
    quantity_before INT,
    quantity_after INT,
    movement_type VARCHAR(50),
    user_id INT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

";

// Execute each table creation separately
$tables = array_filter(array_map('trim', explode('CREATE TABLE', $create_tables_sql)));
foreach ($tables as $table) {
    if (!empty($table)) {
        $sql = 'CREATE TABLE' . $table;
        if (!$conn->query($sql)) {
            // Log error but don't stop (table might already exist)
            error_log('Table creation note: ' . $conn->error);
        }
    }
}

// Set charset to UTF8
$conn->set_charset('utf8mb4');

?>
