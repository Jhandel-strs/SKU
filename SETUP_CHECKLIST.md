# SKU Inventory Tracker - Quick Setup Checklist

## Installation Checklist

### 1. XAMPP Setup
- [ ] XAMPP installed
- [ ] Apache running (green in XAMPP Control Panel)
- [ ] MySQL running (green in XAMPP Control Panel)

### 2. File Structure
- [ ] Files copied to `C:\xampp\htdocs\SKU\Main\`
- [ ] All these files present:
  - [ ] auth.html
  - [ ] auth.js
  - [ ] index.html
  - [ ] storage.html
  - [ ] app.js
  - [ ] storage.js
  - [ ] styles.css
  - [ ] config.php ✨ NEW
  - [ ] api.php ✨ NEW

### 3. Database Setup
- [ ] PhpMyAdmin accessible at `http://localhost/phpmyadmin`
- [ ] Database `sku_inventory` created
- [ ] Tables created:
  - [ ] users
  - [ ] sku_items
  - [ ] transactions
  - [ ] user_activities
  - [ ] inventory_movements

### 4. Configuration
- [ ] config.php has correct credentials:
  - DB_HOST = 'localhost'
  - DB_USER = 'root'
  - DB_PASSWORD = '' (empty)
  - DB_NAME = 'sku_inventory'
- [ ] auth.js API_URL = 'http://localhost/SKU/Main/api.php'
- [ ] auth.js useLocalStorage = false

### 5. Testing
- [ ] Can access `http://localhost/SKU/Main/auth.html`
- [ ] Dropdown visible in registration form ✨ FIXED
- [ ] Can register a new user
- [ ] User appears in PhpMyAdmin `users` table
- [ ] Can login with registered credentials
- [ ] Activities appear in PhpMyAdmin `user_activities` table

## Common Issues & Solutions

### Issue: XAMPP won't start
**Solution:**
- Restart your computer
- Run XAMPP as Administrator
- Check Windows Firewall settings

### Issue: "Cannot connect to database"
**Solution:**
- Verify MySQL is actually running (not just control panel shows it)
- Stop and restart MySQL
- Check config.php credentials

### Issue: Dropdown not showing in register form
**Solution:**
- ✅ Already fixed in auth.html
- Clear browser cache (Ctrl+Shift+Del)
- Try different browser

### Issue: "Access Denied" when registering
**Solution:**
- MySQL password is blank (empty string) for XAMPP root user
- Make sure DB_PASSWORD = '' in config.php

### Issue: Files not loading from localhost
**Solution:**
- Files must be in `C:\xampp\htdocs\SKU\Main\`
- Restart Apache in XAMPP
- Try `http://localhost/SKU/Main/` (with trailing slash)

## Default Credentials

### XAMPP MySQL
- Username: `root`
- Password: (empty/blank)
- Host: localhost
- Port: 3306

### PhpMyAdmin
- Login usually not required (localhost only)
- If asked: username `root`, no password

## File Locations Reference

```
C:\xampp\
├── htdocs\
│   └── SKU\
│       └── Main\
│           ├── auth.html          ← Start here
│           ├── auth.js
│           ├── api.php            ← Database API
│           ├── config.php         ← Database config
│           ├── index.html
│           ├── app.js
│           ├── storage.html
│           ├── storage.js
│           ├── styles.css
│           └── XAMPP_MYSQL_SETUP.md
├── mysql\
│   └── data\
│       └── sku_inventory\         ← Your database files
└── apache\
```

## Quick Access URLs

| Purpose | URL |
|---------|-----|
| Login Page | http://localhost/SKU/Main/auth.html |
| PhpMyAdmin | http://localhost/phpmyadmin |
| Database Direct | http://localhost/SKU/Main/api.php?action=get-all-activities |
| XAMPP Dashboard | http://localhost |

## Next Steps After Setup

1. Register a team member account
2. Login and open inventory tracker
3. Test adding items
4. Check activities in PhpMyAdmin
5. Invite other team members to register

## Support Resources

- **XAMPP Help:** https://www.apachefriends.org/
- **MySQL Help:** https://dev.mysql.com/doc/
- **PhpMyAdmin Help:** https://www.phpmyadmin.net/
- **Our Documentation:** 
  - XAMPP_MYSQL_SETUP.md (this file)
  - DATABASE_INTEGRATION_GUIDE.md
  - auth.html (code comments)

## Getting Help

If something doesn't work:
1. Check this checklist
2. Check the troubleshooting section
3. Review error messages in browser console (F12)
4. Check MySQL error logs in XAMPP

Good luck! 🚀
