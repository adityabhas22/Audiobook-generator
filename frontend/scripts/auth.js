import { API_URL } from './config.js';

class Auth {
    constructor() {
        this.isAuthenticated = false;
        this.user = null;
        this.initializeAuth();
        this.setupEventListeners();
    }

    async initializeAuth() {
        try {
            const response = await fetch(`${API_URL}/users/me`, {
                credentials: 'include'
            });
            if (response.ok) {
                this.user = await response.json();
                this.isAuthenticated = true;
                this.updateUI();
                document.dispatchEvent(new CustomEvent('authStateChanged', { 
                    detail: { isAuthenticated: true, user: this.user }
                }));
            }
        } catch (error) {
            console.error('Error checking auth state:', error);
        }
    }

    setupEventListeners() {
        document.getElementById('login-btn').addEventListener('click', () => this.showAuthModal('signin'));
        document.getElementById('register-btn').addEventListener('click', () => this.showAuthModal('signup'));
        document.getElementById('auth-toggle').addEventListener('click', () => this.toggleAuthMode());
        document.getElementById('auth-submit').addEventListener('click', () => this.handleAuth());
        document.getElementById('logout-btn').addEventListener('click', () => this.handleLogout());
    }

    showAuthModal(mode = 'signin') {
        const modal = document.getElementById('auth-modal');
        const title = document.getElementById('auth-title');
        const submitBtn = document.getElementById('auth-submit');
        const toggleBtn = document.getElementById('auth-toggle');
        const nameGroup = document.getElementById('name-group');

        modal.classList.remove('hidden');
        
        if (mode === 'signin') {
            title.textContent = 'Sign In';
            submitBtn.textContent = 'Sign In';
            toggleBtn.textContent = 'Need an account? Sign Up';
            nameGroup.classList.add('hidden');
        } else {
            title.textContent = 'Sign Up';
            submitBtn.textContent = 'Sign Up';
            toggleBtn.textContent = 'Already have an account? Sign In';
            nameGroup.classList.remove('hidden');
        }
    }

    toggleAuthMode() {
        const title = document.getElementById('auth-title');
        const currentMode = title.textContent === 'Sign In' ? 'signup' : 'signin';
        this.showAuthModal(currentMode);
    }

    async handleAuth() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const name = document.getElementById('name').value;
        const isSignIn = document.getElementById('auth-title').textContent === 'Sign In';

        try {
            if (isSignIn) {
                await this.login(email, password);
            } else {
                await this.register(email, password, name);
            }
        } catch (error) {
            console.error('Auth error:', error);
            alert(error.message);
        }
    }

    async login(email, password) {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const response = await fetch(`${API_URL}/auth/jwt/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData,
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Login failed. Please check your credentials.');
        }

        const userResponse = await fetch(`${API_URL}/users/me`, {
            credentials: 'include'
        });

        if (!userResponse.ok) {
            throw new Error('Failed to get user information after login.');
        }

        this.user = await userResponse.json();
        this.isAuthenticated = true;
        this.updateUI();
        document.getElementById('auth-modal').classList.add('hidden');
        document.dispatchEvent(new CustomEvent('authStateChanged', { 
            detail: { isAuthenticated: true, user: this.user }
        }));
    }

    async register(email, password, name) {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password,
                name,
                is_active: true,
                is_superuser: false,
                is_verified: false
            }),
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Registration failed. Please try again.');
        }

        await this.login(email, password);
    }

    async handleLogout() {
        try {
            await fetch(`${API_URL}/auth/jwt/logout`, {
                method: 'POST',
                credentials: 'include'
            });
            
            this.isAuthenticated = false;
            this.user = null;
            this.updateUI();
            document.dispatchEvent(new CustomEvent('authStateChanged', { 
                detail: { isAuthenticated: false }
            }));
            
            document.querySelectorAll('.view').forEach(view => view.classList.add('hidden'));
            document.getElementById('books-view').classList.remove('hidden');
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    updateUI() {
        const userSection = document.getElementById('user-section');
        const authSection = document.getElementById('auth-section');
        const userName = document.getElementById('user-name');

        if (this.isAuthenticated && this.user) {
            userSection.classList.remove('hidden');
            authSection.classList.add('hidden');
            userName.textContent = this.user.name || this.user.email;
        } else {
            userSection.classList.add('hidden');
            authSection.classList.remove('hidden');
            userName.textContent = '';
        }
    }
}

const auth = new Auth();
export default auth; 