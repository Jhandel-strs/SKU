# SKU Inventory Tracker - XAMPP MySQL Setup Guide

This guide will help you connect your SKU Inventory Tracker to MySQL using XAMPP and PhpMyAdmin.

## Prerequisites

- XAMPP installed on your computer
- Your SKU Inventory files in the XAMPP `htdocs` folder

## Step 1: Install & Setup XAMPP

### Download XAMPP
1. Go to [https://www.apachefriends.org/](https://www.apachefriends.org/)
2. Download XAMPP for your operating system
3. Run the installer and install to `C:\xampp` (or default location)

### Start XAMPP Services
1. Open **XAMPP Control Panel**
2. Click **Start** next to **Apache**
3. Click **Start** next to **MySQL**

You should see:
- Apache: Running (green indicator)
- MySQL: Running (green indicator)

## Step 2: Set Up Project Files

### Option A: Move Files to XAMPP (Windows)

1. Navigate to `C:\xampp\htdocs`
2. Create a new folder: `SKU`
3. Create a subfolder: `Main`
4. Copy all your HTML, CSS, JS, and PHP files into `C:\xampp\htdocs\SKU\Main\`

Your file structure should look like:
```
C:\xampp\htdocs\SKU\Main\
├── auth.html
├── auth.js
├── index.html
├── storage.html
├── app.js
├── storage.js
├── styles.css
├── config.php      (database configuration)
├── api.php         (API endpoints)
└── DATABASE_INTEGRATION_GUIDE.md
```

### Option B: Use Symbolic Link (Advanced)
If you want to keep files in their current location and link to XAMPP:

```bash
# Windows Command Prompt (Run as Administrator)
mklink /D "C:\xampp\htdocs\SKU" "C:\Users\jeric\OneDrive\Documents\SKU"
```

## Step 3: Access Your Application

### Via Browser
1. Open your web browser
2. Navigate to: `http://localhost/SKU/Main/auth.html`

You should now see the login page with the dropdown visible!

## Step 4: Set Up MySQL Database

### Open PhpMyAdmin
1. Keep XAMPP running
2. Open browser and go to: `http://localhost/phpmyadmin`
3. You should see the PhpMyAdmin interface

### Create Database
1. Click on **"New"** in the left sidebar
2. Database name: `sku_inventory`
3. Collation: `utf8mb4_unicode_ci`
4. Click **Create**

### Verify Tables Were Created
1. In PhpMyAdmin, expand `sku_inventory` database
2. You should see these tables:
   - `users` - Stores team members
   - `sku_items` - Stores inventory items
   - `transactions` - Stores transaction history
   - `user_activities` - Stores user activity logs
   - `inventory_movements` - Stores inventory movements

If tables don't appear automatically, run this SQL query:

## Step 5: Configure Your Application

### Update API URL (Already Done)
The `api.php` file is already configured for XAMPP:
```php
define('DB_HOST', 'localhost');
define('DB_USER', 'root');          // XAMPP default
define('DB_PASSWORD', '');          // XAMPP default (empty)
define('DB_NAME', 'sku_inventory');
```

### Test the Connection
1. Go to `http://localhost/SKU/Main/auth.html`
2. Try to **Register** a new user
3. Fill in all fields and submit

If registration works, the database connection is successful!

## Step 6: Using the Application

### First Time Setup
1. Go to `http://localhost/SKU/Main/auth.html`
2. Click **"Register"**
3. Fill in your information:
   - Full Name
   - Email
   - Team/Department (Warehouse, Receiving, etc.)
   - Role (Admin, Manager, Staff)
   - Password (min 6 characters)
4. Click **"Create Account"**

### Login
1. Go back to **"Login"** tab
2. Use your email and password
3. Click **"Login"**

### Access Inventory System
After login, click **"Open Inventory Tracker"** to access the main inventory system.

## Step 7: Monitor Database Activity

### View Users in PhpMyAdmin
1. Open `http://localhost/phpmyadmin`
2. Go to `sku_inventory` > `users`
3. You can see all registered team members

### View Activities
1. Go to `sku_inventory` > `user_activities`
2. See all logged activities (login, logout, check-in, etc.)

### View Transactions
1. Go to `sku_inventory` > `transactions`
2. See all inventory transactions

## Troubleshooting

### "Cannot connect to database"
- **Check 1:** Apache and MySQL are running in XAMPP Control Panel
- **Check 2:** MySQL service is actually running (not just control panel says it is)
- **Fix:** Stop and restart both Apache and MySQL

### Dropdown not visible
- **Status:** Already fixed in auth.html
- The CSS has been updated to show the select dropdown properly

### "Access Denied" error
- **Cause:** MySQL credentials wrong
- **Check:** In `config.php`, verify:
  - DB_USER = 'root'
  - DB_PASSWORD = '' (empty for XAMPP)
  - DB_HOST = 'localhost'

### "Database doesn't exist"
- **Fix:** Run this SQL in PhpMyAdmin:
```sql
CREATE DATABASE IF NOT EXISTS sku_inventory CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### PHP files not executing (showing code instead)
- **Cause:** PHP not configured or file in wrong location
- **Fix:** Make sure files are in `C:\xampp\htdocs\` not your documents folder

## Advanced: Change MySQL Credentials

If you want to use a different MySQL user instead of root:

### Step 1: Create MySQL User in PhpMyAdmin
1. Go to `http://localhost/phpmyadmin`
2. Click **"User accounts"**
3. Click **"Add user account"**
4. Set username: `sku_user`
5. Set password: your secure password
6. Click **Create**

### Step 2: Grant Privileges
1. Select your new user
2. Click **Edit**
3. Go to **Database** tab
4. Click **Check all**
5. Click **Go**

### Step 3: Update config.php
```php
define('DB_USER', 'sku_user');          // Your username
define('DB_PASSWORD', 'your_password'); // Your password
```

## Important Notes

⚠️ **Development Only:**
- This setup is for LOCAL development using XAMPP
- Do NOT use this for production with empty passwords
- For production, use bcrypt and JWT properly

✅ **Security for Production:**
- Set strong MySQL password
- Use bcrypt for password hashing (already implemented in code)
- Use JWT tokens for authentication
- Use HTTPS
- Move files outside web root

## Next Steps

1. ✅ Database is connected to MySQL
2. ✅ Users can register and login
3. ✅ Activities are tracked
4. 🔄 Expand inventory features:
   - Add Excel import functionality
   - Implement barcode scanning
   - Create reports and analytics

## Quick Command Reference

```bash
# Start XAMPP services (Windows)
C:\xampp\xampp-control.exe

# Access application
http://localhost/SKU/Main/auth.html

# Access PhpMyAdmin
http://localhost/phpmyadmin

# Access API directly (testing)
http://localhost/SKU/Main/api.php?action=get-all-activities
```

For support, check the DATABASE_INTEGRATION_GUIDE.md file for additional information.
