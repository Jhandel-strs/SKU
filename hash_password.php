<?php
/**
 * SKU Inventory Tracker - Password Hash Generator
 * Use this to generate secure password hashes for manual database entries
 * 
 * Access via: http://localhost/SKU/Main/hash_password.php
 */
?>
<!DOCTYPE html>
<html>
<head>
    <title>Password Hash Generator</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #333; }
        .form-group {
            margin: 20px 0;
        }
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
        }
        input[type="password"],
        input[type="text"],
        button {
            padding: 10px;
            width: 100%;
            box-sizing: border-box;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        button {
            background: #2563eb;
            color: white;
            cursor: pointer;
            border: none;
            font-weight: bold;
            margin-top: 10px;
        }
        button:hover {
            background: #1d4ed8;
        }
        .result {
            margin-top: 20px;
            padding: 15px;
            background: #f0f0f0;
            border-radius: 4px;
            border-left: 4px solid #2563eb;
        }
        .result h3 { margin-top: 0; }
        .hash-output {
            background: white;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            word-break: break-all;
            font-family: monospace;
            font-size: 12px;
        }
        .info {
            background: #e0f2fe;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
            border-left: 4px solid #0ea5e9;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔐 Password Hash Generator</h1>
        
        <div class="info">
            <strong>ℹ️ How to use:</strong><br>
            1. Enter a password you want to hash<br>
            2. Click "Generate Hash"<br>
            3. Copy the generated hash<br>
            4. Use it in your database for user passwords
        </div>

        <form method="POST">
            <div class="form-group">
                <label for="password">Enter Password to Hash:</label>
                <input type="password" id="password" name="password" placeholder="Enter password" required>
            </div>
            
            <button type="submit">Generate Hash</button>
        </form>

        <?php
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $password = $_POST['password'] ?? '';
            
            if (!empty($password)) {
                $hash = password_hash($password, PASSWORD_BCRYPT);
                ?>
                <div class="result">
                    <h3>✅ Hash Generated</h3>
                    <strong>Original Password:</strong> 
                    <div class="hash-output" style="background: #fff8dc; margin-bottom: 10px;">
                        <?php echo htmlspecialchars($password); ?>
                    </div>
                    
                    <strong>Hashed Password (use in database):</strong>
                    <div class="hash-output">
                        <?php echo htmlspecialchars($hash); ?>
                    </div>
                    
                    <p style="margin-top: 15px; font-size: 12px; color: #666;">
                        ℹ️ <strong>To add this user to the database:</strong><br>
                        1. Go to PhpMyAdmin (http://localhost/phpmyadmin)<br>
                        2. Open sku_inventory > users table<br>
                        3. Click "Insert"<br>
                        4. Fill in: name, email, team, role<br>
                        5. Paste this hash in the password field<br>
                        6. Click Go
                    </p>
                    
                    <p style="margin-top: 10px; font-size: 12px; color: #999;">
                        ⚠️ Each time you refresh or generate again, a new hash is created (even for the same password). This is normal and secure.
                    </p>
                </div>
                <?php
            }
        }
        ?>
    </div>
</body>
</html>
