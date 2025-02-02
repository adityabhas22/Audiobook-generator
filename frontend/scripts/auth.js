import { API_URL } from './config.js';

const DEBUG = true;

function debug(...args) {
    if (DEBUG) {
        console.log('[Auth Debug]', ...args);
    }
}

class Auth {
    constructor() {
        this.isAuthenticated = false;
        this.user = null;
        debug('Auth initialized', { API_URL });
        this.setupEventListeners();
        this.updateUI(); // Just update UI based on initial state
    }

    setupEventListeners() {
        document.getElementById('login-btn').addEventListener('click', () => this.showAuthModal('signin'));
        document.getElementById('register-btn').addEventListener('click', () => this.showAuthModal('signup'));
        document.getElementById('auth-toggle').addEventListener('click', () => this.toggleAuthMode());
        document.getElementById('auth-submit').addEventListener('click', () => this.handleAuth());
        document.getElementById('logout-btn').addEventListener('click', () => this.handleLogout());
        debug('Event listeners set up');
    }

    showAuthModal(mode = 'signin') {
        debug('Showing auth modal', { mode });
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
        debug('Toggling auth mode', { currentMode });
        this.showAuthModal(currentMode);
    }

    async handleAuth() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const name = document.getElementById('name').value;
        const isSignIn = document.getElementById('auth-title').textContent === 'Sign In';

        debug('Handling auth', { isSignIn, email });

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
        debug('Attempting login', { email });
        try {
            const response = await fetch(`${API_URL}/auth/jwt/login`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    username: email,
                    password: password,
                }),
            });

            debug('Login response', { 
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries())
            });

            if (response.ok) {
                debug('Login successful, getting user info');
                await this.getCurrentUser();
                return true;
            }

            debug('Login failed');
            return false;
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    }

    async getCurrentUser() {
        debug('Getting current user');
        try {
            const response = await fetch(`${API_URL}/users/me`, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                }
            });

            debug('Get user response', { 
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries())
            });

            if (response.ok) {
                this.user = await response.json();
                this.isAuthenticated = true;
                debug('User info retrieved', { user: this.user });
                this.updateUI();
                document.dispatchEvent(new CustomEvent('authStateChanged', { 
                    detail: { isAuthenticated: true, user: this.user }
                }));
                return this.user;
            }
            
            debug('Failed to get user info');
            this.user = null;
            this.isAuthenticated = false;
            this.updateUI();
            document.dispatchEvent(new CustomEvent('authStateChanged', { 
                detail: { isAuthenticated: false }
            }));
            return null;
        } catch (error) {
            console.error('Get user error:', error);
            this.user = null;
            this.isAuthenticated = false;
            this.updateUI();
            document.dispatchEvent(new CustomEvent('authStateChanged', { 
                detail: { isAuthenticated: false }
            }));
            return null;
        }
    }

    async register(email, password, name) {
        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    password,
                    name,
                }),
            });

            if (response.ok) {
                await this.login(email, password);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Registration error:', error);
            return false;
        }
    }

    async handleLogout() {
        try {
            const response = await fetch(`${API_URL}/auth/jwt/logout`, {
                method: 'POST',
                credentials: 'include',
            });

            if (response.ok) {
                this.user = null;
                this.isAuthenticated = false;
                this.updateUI();
                document.dispatchEvent(new CustomEvent('authStateChanged', { 
                    detail: { isAuthenticated: false }
                }));
                
                document.querySelectorAll('.view').forEach(view => view.classList.add('hidden'));
                document.getElementById('books-view').classList.remove('hidden');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Logout error:', error);
            return false;
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