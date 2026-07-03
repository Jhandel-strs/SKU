# SKU Inventory Tracker - Database Integration Guide

This guide provides step-by-step instructions to connect your SKU Inventory Tracker to a real database for persistent inventory management.

## Overview

Currently, your app stores data in **local browser storage** (localStorage). To integrate a real database, you'll need:
1. A backend server (Node.js, Python, etc.)
2. A database (PostgreSQL, MySQL, MongoDB, etc.)
3. API endpoints to communicate between frontend and backend

## Current Features

### ✅ Authentication System (Working with Local Storage)
- User registration with team and role assignment
- Login/Logout functionality
- Team member tracking
- Activity logging for each user
- Real-time user info display on dashboard

### ✅ Activity Tracking
- All user activities are logged (login, logout, item check-in/out, removals)
- Per-user activity history
- Timestamps and descriptions for all actions

### ⏳ Ready for Database Connection
The authentication system is built to easily connect to your database backend. Simply:
1. Set up the backend with provided code
2. Change `useLocalStorage = false` in `auth.js`
3. Update the `API_URL` in `auth.js` to point to your backend

---

## Option 1: Node.js + Express + PostgreSQL (Recommended)

### Prerequisites
- Node.js installed on your server
- PostgreSQL database
- npm or yarn

### Step 1: Set Up Node.js Backend

Create a new folder for your backend:
```bash
mkdir sku-inventory-backend
cd sku-inventory-backend
npm init -y
npm install express pg cors dotenv body-parser
```

### Step 2: Create Database Schema

Connect to PostgreSQL and create tables:

```sql
-- Create Users table (Team Members)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    team VARCHAR(100),
    role VARCHAR(50), -- admin, manager, staff
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create SKU Items table
CREATE TABLE sku_items (
    id SERIAL PRIMARY KEY,
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Transaction History table
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50),
    user_id INT,
    action_type VARCHAR(50), -- Check In, Check Out, Review
    quantity_changed INT,
    note VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sku) REFERENCES sku_items(sku),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create Activity Log table
CREATE TABLE user_activities (
    id SERIAL PRIMARY KEY,
    user_id INT,
    activity_type VARCHAR(50),
    description VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create inventory movement log
CREATE TABLE inventory_movements (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50),
    quantity_before INT,
    quantity_after INT,
    movement_type VARCHAR(50),
    user_id INT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sku) REFERENCES sku_items(sku),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Step 3: Create Express Server

Create `server.js`:

```javascript
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

app.use(cors());
app.use(express.json());

// GET all SKU items
app.get('/api/items', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM sku_items');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// GET specific item by SKU
app.get('/api/items/:sku', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM sku_items WHERE sku = $1', [req.params.sku]);
        res.json(result.rows[0] || null);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST new item
app.post('/api/items', async (req, res) => {
    const { sku, product_name, barcode, price_per_case, cases_ordered, counts_per_case, total_quantity, unit, total_oz_pc, servings_needed } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO sku_items (sku, product_name, barcode, price_per_case, cases_ordered, counts_per_case, total_quantity, unit, total_oz_pc, servings_needed) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
            [sku, product_name, barcode, price_per_case, cases_ordered, counts_per_case, total_quantity, unit, total_oz_pc, servings_needed]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE item
app.put('/api/items/:sku', async (req, res) => {
    const { total_quantity, cases_ordered } = req.body;
    try {
        const result = await pool.query(
            'UPDATE sku_items SET total_quantity = $1, cases_ordered = $2, updated_at = CURRENT_TIMESTAMP WHERE sku = $3 RETURNING *',
            [total_quantity, cases_ordered, req.params.sku]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE item
app.delete('/api/items/:sku', async (req, res) => {
    try {
        await pool.query('DELETE FROM sku_items WHERE sku = $1', [req.params.sku]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST transaction
app.post('/api/transactions', async (req, res) => {
    const { sku, user_id, action_type, quantity_changed, note } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO transactions (sku, user_id, action_type, quantity_changed, note) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [sku, user_id, action_type, quantity_changed, note]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET transactions
app.get('/api/transactions', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 100');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== AUTHENTICATION ENDPOINTS ==========

// Register new user
app.post('/api/auth/register', async (req, res) => {
    const { name, email, team, role, password } = req.body;
    
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        // In production, use bcrypt: const hashedPassword = await bcrypt.hash(password, 10);
        // For now, using simple hash (NOT SECURE - use bcrypt in production!)
        const hashedPassword = password; // Replace with bcrypt hash

        const result = await pool.query(
            'INSERT INTO users (name, email, team, role, password) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, team, role',
            [name, email, team, role, hashedPassword]
        );
        
        res.status(201).json({
            message: 'User registered successfully',
            user: result.rows[0]
        });
    } catch (err) {
        if (err.code === '23505') {
            res.status(400).json({ message: 'Email already registered' });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password required' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const user = result.rows[0];
        
        // In production, use bcrypt: const validPassword = await bcrypt.compare(password, user.password);
        const validPassword = user.password === password; // Replace with bcrypt compare

        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // In production, create a JWT token
        // const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
        // For now, use a simple token
        const token = Buffer.from(user.id.toString()).toString('base64');

        res.json({
            message: 'Login successful',
            token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                team: user.team,
                role: user.role
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET user activities
app.get('/api/activities/:userId', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM user_activities WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
            [req.params.userId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST user activity
app.post('/api/activities', async (req, res) => {
    const { user_id, activity_type, description } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO user_activities (user_id, activity_type, description) VALUES ($1, $2, $3) RETURNING *',
            [user_id, activity_type, description]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

### Step 4: Create `.env` file

```
DB_USER=your_postgres_user
DB_HOST=localhost
DB_NAME=sku_inventory
DB_PASSWORD=your_password
DB_PORT=5432
PORT=5000
```

### Step 5: Run the server

```bash
node server.js
```

### Step 6: Connect Frontend Authentication to Backend

1. Open `auth.js` in your project
2. Change `useLocalStorage = true` to `useLocalStorage = false` (around line 7)
3. Update `API_URL` to match your backend URL:
   ```javascript
   this.API_URL = 'http://localhost:5000/api'; // or your production URL
   ```
4. Users will now authenticate against the database instead of local storage
5. All activities and transactions will be saved to the database

### Step 7: Update `app.js` and `storage.js` to Use Database

Replace localStorage calls with API calls for inventory items and transactions. The current code already has a structure ready for this - just uncomment the backend calls when you're ready.

---

## Option 2: Quick Setup with Supabase (Cloud-Hosted PostgreSQL)

Supabase is the easiest option if you don't want to manage your own server.

### Steps:
1. Go to [supabase.com](https://supabase.com) and create a project
2. Create the same tables (from Step 2 above) using Supabase's SQL editor
3. Get your API key and URL from Supabase settings
4. Replace the `API_URL` in your frontend code

---

## Integrating Database with Your Frontend

### Update your JavaScript to use API calls

Edit your `app.js` and `storage.js` to replace localStorage with API calls:

```javascript
// Replace localStorage calls with API calls
const API_URL = 'http://localhost:5000/api'; // or your Supabase URL

class InventoryApp {
    constructor() {
        this.items = {};
        // ... other initialization
        this.loadItemsFromDatabase(); // instead of this.loadItems();
    }

    async loadItemsFromDatabase() {
        try {
            const response = await fetch(`${API_URL}/items`);
            const data = await response.json();
            // Convert array to object keyed by SKU
            this.items = {};
            data.forEach(item => {
                this.items[item.sku] = item;
            });
            this.updateSummary();
        } catch (error) {
            console.error('Error loading items:', error);
        }
    }

    async saveItemToDatabase(item) {
        try {
            const response = await fetch(`${API_URL}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });
            return await response.json();
        } catch (error) {
            console.error('Error saving item:', error);
        }
    }

    async updateItemInDatabase(sku, updates) {
        try {
            const response = await fetch(`${API_URL}/items/${sku}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            return await response.json();
        } catch (error) {
            console.error('Error updating item:', error);
        }
    }

    async deleteItemFromDatabase(sku) {
        try {
            const response = await fetch(`${API_URL}/items/${sku}`, {
                method: 'DELETE'
            });
            return await response.json();
        } catch (error) {
            console.error('Error deleting item:', error);
        }
    }

    async logTransaction(sku, userId, actionType, quantity, note) {
        try {
            const response = await fetch(`${API_URL}/transactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sku,
                    user_id: userId,
                    action_type: actionType,
                    quantity_changed: quantity,
                    note
                })
            });
            return await response.json();
        } catch (error) {
            console.error('Error logging transaction:', error);
        }
    }
}
```

---

## Option 3: Google Sheets + Google Apps Script

If you prefer a simpler solution without managing servers:

1. Create a Google Sheet with columns: SKU, Product Name, Quantity, etc.
2. Use Google Apps Script to create API endpoints
3. Deploy as web app
4. Modify your frontend to use the Google Apps Script API

---

## Deployment

### Using Heroku (Free/Paid Options)

```bash
# Login to Heroku
heroku login

# Create app
heroku create your-sku-app

# Set environment variables
heroku config:set DB_USER=your_user
heroku config:set DB_PASSWORD=your_password
# ... set other env vars

# Deploy
git push heroku main
```

### Using AWS RDS for Database

1. Create RDS PostgreSQL instance
2. Update `.env` with RDS connection details
3. Deploy server to EC2 or AWS Lambda

---

## Security Considerations

1. **Use HTTPS** - Always encrypt data in transit
2. **API Authentication** - Add JWT tokens to secure endpoints
3. **CORS** - Restrict API to your domain only
4. **SQL Injection** - Always use parameterized queries (done in examples above)
5. **Rate Limiting** - Limit API requests to prevent abuse
6. **Data Validation** - Validate all inputs on backend

---

## Next Steps

1. Choose your database option
2. Set up backend server
3. Create database schema
4. Update frontend code to use API calls
5. Test thoroughly before deployment
6. Monitor database performance

For questions or issues, refer to the documentation of your chosen database and framework.
