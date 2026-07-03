/**
 * SKU Inventory Tracker - Authentication & User Management
 * Handles login, registration, and team member tracking
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.users = [];
        this.activities = [];
        this.API_URL = 'http://localhost/SKU/Main/api.php'; // XAMPP local path
        this.useLocalStorage = false; // Set to true for local storage, false for MySQL
        
        this.loadElements();
        this.bindEvents();
        this.checkUserSession();
    }

    loadElements() {
        // Tab elements
        this.tabButtons = document.querySelectorAll('.auth-tab');
        this.loginForm = document.getElementById('loginForm');
        this.registerForm = document.getElementById('registerForm');
        this.userDashboard = document.getElementById('userDashboard');

        // Login form inputs
        this.loginEmail = document.getElementById('loginEmail');
        this.loginPassword = document.getElementById('loginPassword');
        this.loginError = document.getElementById('loginError');
        this.loginLoading = document.getElementById('loginLoading');

        // Register form inputs
        this.registerName = document.getElementById('registerName');
        this.registerEmail = document.getElementById('registerEmail');
        this.registerTeam = document.getElementById('registerTeam');
        this.registerRole = document.getElementById('registerRole');
        this.registerPassword = document.getElementById('registerPassword');
        this.registerPasswordConfirm = document.getElementById('registerPasswordConfirm');
        this.registerError = document.getElementById('registerError');
        this.registerSuccess = document.getElementById('registerSuccess');
        this.registerLoading = document.getElementById('registerLoading');

        // Dashboard elements
        this.userDisplayName = document.getElementById('userDisplayName');
        this.userTeam = document.getElementById('userTeam');
        this.userActivityList = document.getElementById('userActivityList');
        this.logoutBtn = document.getElementById('logoutBtn');

        // Settings modal elements
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettingsBtn = document.getElementById('closeSettingsBtn');
        this.settingsTabs = document.querySelectorAll('.settings-tab');
        this.passwordTab = document.getElementById('passwordTab');
        this.passcodeTab = document.getElementById('passcodeTab');
        this.updatePasswordBtn = document.getElementById('updatePasswordBtn');
        this.setPasscodeBtn = document.getElementById('setPasscodeBtn');
        this.currentPassword = document.getElementById('currentPassword');
        this.newPassword = document.getElementById('newPassword');
        this.confirmNewPassword = document.getElementById('confirmNewPassword');
        this.setPasscode = document.getElementById('setPasscode');
        this.confirmPasscode = document.getElementById('confirmPasscode');
        this.passwordError = document.getElementById('passwordError');
        this.passwordSuccess = document.getElementById('passwordSuccess');
        this.passwordLoading = document.getElementById('passwordLoading');
        this.passcodeError = document.getElementById('passcodeError');
        this.passcodeSuccess = document.getElementById('passcodeSuccess');
        this.passcodeLoading = document.getElementById('passcodeLoading');

        // Forgot password elements
        this.forgotPasswordLink = document.getElementById('forgotPasswordLink');
        this.forgotPasswordModal = document.getElementById('forgotPasswordModal');
        this.closeForgotBtn = document.getElementById('closeForgotBtn');
        this.forgotPasswordForm = document.getElementById('forgotPasswordForm');
        this.forgotEmail = document.getElementById('forgotEmail');
        this.forgotError = document.getElementById('forgotError');
        this.forgotSuccess = document.getElementById('forgotSuccess');
        this.forgotLoading = document.getElementById('forgotLoading');

        // Login passcode element
        this.loginPasscode = document.getElementById('loginPasscode');
        this.passcodeField = document.getElementById('passcodeField');
    }

    bindEvents() {
        // Tab switching
        this.tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Form submissions
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        this.registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        this.logoutBtn.addEventListener('click', () => this.logout());

        // Settings modal
        this.settingsBtn.addEventListener('click', () => this.openSettingsModal());
        this.closeSettingsBtn.addEventListener('click', () => this.closeSettingsModal());
        this.settingsTabs.forEach(tab => {
            tab.addEventListener('click', (e) => this.switchSettingsTab(e.target.dataset.tab));
        });
        this.updatePasswordBtn.addEventListener('click', () => this.updatePassword());
        this.setPasscodeBtn.addEventListener('click', () => this.setUserPasscode());

        // Forgot password
        this.forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.openForgotPasswordModal();
        });
        this.closeForgotBtn.addEventListener('click', () => this.closeForgotPasswordModal());
        this.forgotPasswordForm.addEventListener('submit', (e) => this.handleForgotPassword(e));

        // Load data from storage
        this.loadUsersFromStorage();
    }

    switchTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.auth-tab').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');

        // Update forms
        this.loginForm.classList.remove('active');
        this.registerForm.classList.remove('active');

        if (tab === 'login') {
            this.loginForm.classList.add('active');
        } else {
            this.registerForm.classList.add('active');
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        this.clearMessages('login');
        this.showLoading('login', true);

        const email = this.loginEmail.value.trim();
        const password = this.loginPassword.value;
        const passcode = this.loginPasscode.value.trim();

        // Validation
        if (!email || !password) {
            this.showError('login', 'Please enter email and password');
            this.showLoading('login', false);
            return;
        }

        try {
            if (this.useLocalStorage) {
                // Local storage login
                await this.loginLocalStorage(email, password, passcode);
            } else {
                // Backend login
                await this.loginBackend(email, password, passcode);
            }
        } catch (error) {
            this.showError('login', error.message);
        }

        this.showLoading('login', false);
    }

    async loginLocalStorage(email, password, passcode) {
        const user = this.users.find(u => u.email === email);

        if (!user) {
            throw new Error('User not found');
        }

        // Simple password check (in production, use bcrypt on backend)
        if (user.password !== this.hashPassword(password)) {
            throw new Error('Invalid password');
        }

        // Check if user has passcode set
        if (user.passcode) {
            if (!passcode) {
                // Show passcode field
                this.passcodeField.style.display = 'block';
                this.loginPasscode.focus();
                this.showLoading('login', false);
                throw new Error('Please enter your passcode to continue');
            }

            // Verify passcode
            if (user.passcode !== passcode) {
                throw new Error('Invalid passcode');
            }
        }

        this.setCurrentUser(user);
    }

    async loginBackend(email, password, passcode) {
        const response = await fetch(`${this.API_URL}?action=login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, passcode })
        });

        const data = await response.json();
        
        if (!response.ok || data.error) {
            // Check if passcode is needed
            if (data.needsPasscode) {
                this.passcodeField.style.display = 'block';
                this.loginPasscode.focus();
                this.showLoading('login', false);
                throw new Error('Please enter your passcode to continue');
            }
            throw new Error(data.error || 'Login failed. Check your credentials.');
        }

        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        this.setCurrentUser(data.user);
    }

    async handleRegister(e) {
        e.preventDefault();
        this.clearMessages('register');
        this.showLoading('register', true);

        const name = this.registerName.value.trim();
        const email = this.registerEmail.value.trim();
        const team = this.registerTeam.value.trim();
        const role = this.registerRole.value;
        const password = this.registerPassword.value;
        const passwordConfirm = this.registerPasswordConfirm.value;

        // Validation
        if (!name || !email || !team || !role || !password) {
            this.showError('register', 'Please fill in all fields');
            this.showLoading('register', false);
            return;
        }

        if (password.length < 6) {
            this.showError('register', 'Password must be at least 6 characters');
            this.showLoading('register', false);
            return;
        }

        if (password !== passwordConfirm) {
            this.showError('register', 'Passwords do not match');
            this.showLoading('register', false);
            return;
        }

        // Check if email already exists
        if (this.users.some(u => u.email === email)) {
            this.showError('register', 'Email already registered');
            this.showLoading('register', false);
            return;
        }

        try {
            if (this.useLocalStorage) {
                await this.registerLocalStorage(name, email, team, role, password);
            } else {
                await this.registerBackend(name, email, team, role, password);
            }
        } catch (error) {
            this.showError('register', error.message);
        }

        this.showLoading('register', false);
    }

    async registerLocalStorage(name, email, team, role, password) {
        const newUser = {
            id: Date.now().toString(),
            name,
            email,
            team,
            role,
            password: this.hashPassword(password),
            created_at: new Date().toISOString()
        };

        this.users.push(newUser);
        this.saveUsersToStorage();

        this.showSuccess('register', 'Account created successfully! You can now login.');
        
        // Reset form
        this.registerForm.reset();
        
        // Switch to login after 2 seconds
        setTimeout(() => {
            this.switchTab('login');
        }, 2000);
    }

    async registerBackend(name, email, team, role, password) {
        const response = await fetch(`${this.API_URL}?action=register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, team, role, password })
        });

        const data = await response.json();
        
        if (!response.ok || data.error) {
            throw new Error(data.error || data.message || 'Registration failed');
        }

        this.showSuccess('register', 'Account created successfully! You can now login.');
        this.registerForm.reset();

        setTimeout(() => {
            this.switchTab('login');
        }, 2000);
    }

    setCurrentUser(user) {
        this.currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        // Log login activity
        this.logActivity(user.id, 'login', `${user.name} logged in`);
        
        // Show dashboard
        this.showDashboard();
    }

    showDashboard() {
        this.loginForm.style.display = 'none';
        this.registerForm.style.display = 'none';
        this.userDashboard.style.display = 'block';

        this.userDisplayName.textContent = this.currentUser.name;
        this.userTeam.textContent = `Team: ${this.currentUser.team} | Role: ${this.currentUser.role}`;

        this.loadUserActivities();
    }

    loadUserActivities() {
        if (!this.useLocalStorage) {
            // Fetch from backend
            fetch(`${this.API_URL}?action=get-activities`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: this.currentUser.id })
            })
            .then(res => res.json())
            .then(activities => {
                if (activities.length === 0) {
                    this.userActivityList.innerHTML = '<p class="activity-item">No activities yet</p>';
                    return;
                }

                this.userActivityList.innerHTML = activities
                    .slice(0, 5)
                    .map(activity => `
                        <div class="activity-item">
                            <div>${activity.description}</div>
                            <span class="activity-time">${this.formatTime(activity.created_at)}</span>
                        </div>
                    `)
                    .join('');
            })
            .catch(err => console.error('Error loading activities:', err));
        } else {
            // Local storage
            const userActivities = this.activities.filter(a => a.userId === this.currentUser.id).slice(-5);

            if (userActivities.length === 0) {
                this.userActivityList.innerHTML = '<p class="activity-item">No activities yet</p>';
                return;
            }

            this.userActivityList.innerHTML = userActivities
                .reverse()
                .map(activity => `
                    <div class="activity-item">
                        <div>${activity.description}</div>
                        <span class="activity-time">${this.formatTime(activity.timestamp)}</span>
                    </div>
                `)
                .join('');
        }
    }

    logActivity(userId, type, description) {
        const activity = {
            id: Date.now().toString(),
            userId,
            type,
            description,
            timestamp: new Date().toISOString()
        };

        this.activities.push(activity);
        this.saveActivitiesToStorage();
    }

    logout() {
        // Log logout activity
        this.logActivity(this.currentUser.id, 'logout', `${this.currentUser.name} logged out`);

        this.currentUser = null;
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');

        // Reset UI
        this.loginForm.style.display = 'block';
        this.registerForm.style.display = 'none';
        this.userDashboard.style.display = 'none';
        this.passcodeField.style.display = 'none';

        this.loginForm.classList.add('active');
        this.registerForm.classList.remove('active');

        // Clear forms
        this.loginForm.reset();
        this.registerForm.reset();
        this.clearMessages('login');
        this.clearMessages('register');
    }

    // Settings Modal Methods
    openSettingsModal() {
        this.settingsModal.classList.remove('hidden');
        this.settingsModal.classList.add('show');
        this.switchSettingsTab('password');
    }

    closeSettingsModal() {
        this.settingsModal.classList.add('hidden');
        this.settingsModal.classList.remove('show');
        this.clearMessages('password');
        this.clearMessages('passcode');
        this.currentPassword.value = '';
        this.newPassword.value = '';
        this.confirmNewPassword.value = '';
        this.setPasscode.value = '';
        this.confirmPasscode.value = '';
    }

    switchSettingsTab(tab) {
        document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.settings-tab-content').forEach(c => c.classList.remove('active'));
        
        event.target.classList.add('active');
        document.getElementById(tab + 'Tab').classList.add('active');
    }

    async updatePassword() {
        const current = this.currentPassword.value;
        const newPass = this.newPassword.value;
        const confirmPass = this.confirmNewPassword.value;

        // Validation
        if (!current || !newPass || !confirmPass) {
            this.showError('password', 'Please fill in all fields');
            return;
        }

        if (newPass !== confirmPass) {
            this.showError('password', 'New passwords do not match');
            return;
        }

        if (newPass.length < 6) {
            this.showError('password', 'Password must be at least 6 characters');
            return;
        }

        this.clearMessages('password');
        this.showLoading('password', true);

        try {
            if (this.useLocalStorage) {
                await this.updatePasswordLocal(current, newPass);
            } else {
                await this.updatePasswordBackend(current, newPass);
            }

            this.showSuccess('password', 'Password updated successfully!');
            this.currentPassword.value = '';
            this.newPassword.value = '';
            this.confirmNewPassword.value = '';

            setTimeout(() => {
                this.closeSettingsModal();
            }, 2000);
        } catch (error) {
            this.showError('password', error.message);
        }

        this.showLoading('password', false);
    }

    async updatePasswordLocal(currentPassword, newPassword) {
        if (this.currentUser.password !== this.hashPassword(currentPassword)) {
            throw new Error('Current password is incorrect');
        }

        const user = this.users.find(u => u.id === this.currentUser.id);
        user.password = this.hashPassword(newPassword);
        this.currentUser.password = user.password;

        this.saveUsersToStorage();
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    }

    async updatePasswordBackend(currentPassword, newPassword) {
        const response = await fetch(`${this.API_URL}?action=update-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: this.currentUser.id,
                current_password: currentPassword,
                new_password: newPassword
            })
        });

        const data = await response.json();
        if (!response.ok || data.error) {
            throw new Error(data.error || 'Failed to update password');
        }
    }

    async setUserPasscode() {
        const passcode = this.setPasscode.value.trim();
        const confirmPasscode = this.confirmPasscode.value.trim();

        // Validation
        if (!passcode || !confirmPasscode) {
            this.showError('passcode', 'Please fill in all fields');
            return;
        }

        if (passcode !== confirmPasscode) {
            this.showError('passcode', 'Passcodes do not match');
            return;
        }

        if (!/^\d{4}$/.test(passcode)) {
            this.showError('passcode', 'Passcode must be exactly 4 digits');
            return;
        }

        this.clearMessages('passcode');
        this.showLoading('passcode', true);

        try {
            if (this.useLocalStorage) {
                await this.setPasscodeLocal(passcode);
            } else {
                await this.setPasscodeBackend(passcode);
            }

            this.showSuccess('passcode', 'Passcode saved successfully!');
            this.setPasscode.value = '';
            this.confirmPasscode.value = '';

            setTimeout(() => {
                this.closeSettingsModal();
            }, 2000);
        } catch (error) {
            this.showError('passcode', error.message);
        }

        this.showLoading('passcode', false);
    }

    async setPasscodeLocal(passcode) {
        const user = this.users.find(u => u.id === this.currentUser.id);
        user.passcode = passcode;
        this.currentUser.passcode = passcode;

        this.saveUsersToStorage();
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    }

    async setPasscodeBackend(passcode) {
        const response = await fetch(`${this.API_URL}?action=set-passcode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: this.currentUser.id,
                passcode: passcode
            })
        });

        const data = await response.json();
        if (!response.ok || data.error) {
            throw new Error(data.error || 'Failed to set passcode');
        }

        this.currentUser.passcode = passcode;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    }

    // Forgot Password Methods
    openForgotPasswordModal() {
        this.forgotPasswordModal.classList.remove('hidden');
        this.forgotPasswordModal.classList.add('show');
        this.forgotEmail.focus();
    }

    closeForgotPasswordModal() {
        this.forgotPasswordModal.classList.add('hidden');
        this.forgotPasswordModal.classList.remove('show');
        this.forgotPasswordForm.reset();
        this.clearMessages('forgot');
    }

    async handleForgotPassword(e) {
        e.preventDefault();
        const email = this.forgotEmail.value.trim();

        if (!email) {
            this.showError('forgot', 'Please enter your email');
            return;
        }

        this.clearMessages('forgot');
        this.showLoading('forgot', true);

        try {
            if (this.useLocalStorage) {
                await this.handleForgotPasswordLocal(email);
            } else {
                await this.handleForgotPasswordBackend(email);
            }
        } catch (error) {
            this.showError('forgot', error.message);
        }

        this.showLoading('forgot', false);
    }

    async handleForgotPasswordLocal(email) {
        const user = this.users.find(u => u.email === email);

        if (!user) {
            throw new Error('Email not found');
        }

        // Generate temporary password
        const tempPassword = Math.random().toString(36).substring(2, 10);
        user.password = this.hashPassword(tempPassword);
        this.saveUsersToStorage();

        this.showSuccess('forgot', `Password reset to: ${tempPassword}\\nPlease login and change your password immediately.`);
        
        setTimeout(() => {
            this.closeForgotPasswordModal();
        }, 3000);
    }

    async handleForgotPasswordBackend(email) {
        const response = await fetch(`${this.API_URL}?action=forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();
        if (!response.ok || data.error) {
            throw new Error(data.error || 'Failed to process request');
        }

        this.showSuccess('forgot', data.message || 'Password reset email sent. Check your inbox.');
        
        setTimeout(() => {
            this.closeForgotPasswordModal();
        }, 3000);
    }

    checkUserSession() {
        const savedUser = localStorage.getItem('currentUser');
        
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.showDashboard();
        }
    }

    // Storage methods
    saveUsersToStorage() {
        localStorage.setItem('skuUsers', JSON.stringify(this.users));
    }

    loadUsersFromStorage() {
        const saved = localStorage.getItem('skuUsers');
        if (saved) {
            this.users = JSON.parse(saved);
        }
    }

    saveActivitiesToStorage() {
        localStorage.setItem('skuActivities', JSON.stringify(this.activities));
    }

    loadActivitiesFromStorage() {
        const saved = localStorage.getItem('skuActivities');
        if (saved) {
            this.activities = JSON.parse(saved);
        }
    }

    // Utility methods
    hashPassword(password) {
        // Simple hash (use bcrypt on backend in production)
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }

    showError(form, message) {
        const errorEl = document.getElementById(`${form}Error`);
        errorEl.textContent = message;
        errorEl.classList.add('show');
    }

    showSuccess(form, message) {
        const successEl = document.getElementById(`${form}Success`);
        successEl.textContent = message;
        successEl.classList.add('show');
    }

    showLoading(form, show) {
        const loadingEl = document.getElementById(`${form}Loading`);
        if (show) {
            loadingEl.classList.add('show');
        } else {
            loadingEl.classList.remove('show');
        }
    }

    clearMessages(form) {
        const errorEl = document.getElementById(`${form}Error`);
        const successEl = document.getElementById(`${form}Success`);
        errorEl.classList.remove('show');
        if (successEl) successEl.classList.remove('show');
    }

    formatTime(isoString) {
        const date = new Date(isoString);
        const now = new Date();
        const diffMinutes = Math.floor((now - date) / 60000);

        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
        return date.toLocaleDateString();
    }

    // Method to get current user info (called from other scripts)
    getCurrentUser() {
        return this.currentUser;
    }

    // Method to log activity from other pages
    static logActivityFromPage(type, description) {
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            const user = JSON.parse(currentUser);
            
            // Try to send to backend first
            fetch('http://localhost/SKU/Main/api.php?action=log-activity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    activity_type: type,
                    description: description
                })
            }).catch(() => {
                // Fallback to local storage if backend fails
                const activity = {
                    userId: user.id,
                    type,
                    description,
                    timestamp: new Date().toISOString()
                };

                let activities = JSON.parse(localStorage.getItem('skuActivities') || '[]');
                activities.push(activity);
                localStorage.setItem('skuActivities', JSON.stringify(activities));
            });
        }
    }
}

// Initialize auth manager when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});
