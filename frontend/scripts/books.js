import { API_URL } from './config.js';
import auth from './auth.js';

const FETCH_TIMEOUT = 30000; // 30 seconds timeout for API calls

class Books {
    constructor() {
        this.books = [];
        this.app = null;
        this.initialized = false;
        this.appInitInterval = null;
        this.maxInitAttempts = 20;
        this.initAttempts = 0;
        this.eventListeners = new Map(); // Track event listeners for cleanup
        this.voiceSelectObserver = null;
        
        // Bind methods to preserve this context
        this.handleAuthStateChange = this.handleAuthStateChange.bind(this);
        this.handleVoiceChange = this.handleVoiceChange.bind(this);
        this.handleVoiceChangeEvent = (e) => this.handleVoiceChange(e.detail);
        this.destroy = this.destroy.bind(this);
        
        // Add event listeners
        document.addEventListener('authStateChanged', this.handleAuthStateChange);
        window.addEventListener('voiceChanged', this.handleVoiceChangeEvent);
        window.addEventListener('unload', this.destroy);
    }

    destroy() {
        // Cleanup all event listeners and intervals
        document.removeEventListener('authStateChanged', this.handleAuthStateChange);
        window.removeEventListener('voiceChanged', this.handleVoiceChangeEvent);
        window.removeEventListener('unload', this.destroy);
        
        // Clean up tracked event listeners
        this.eventListeners.forEach((cleanup) => cleanup());
        this.eventListeners.clear();
        
        if (this.appInitInterval) {
            clearInterval(this.appInitInterval);
            this.appInitInterval = null;
        }

        // Clean up voice observer
        if (this.voiceSelectObserver) {
            this.voiceSelectObserver.disconnect();
            this.voiceSelectObserver = null;
        }
        
        this.initialized = false;
        this.app = null;
    }

    // Add event listener with automatic cleanup tracking
    addEventListenerWithCleanup(element, event, handler) {
        if (!element) return;
        
        element.addEventListener(event, handler);
        const cleanup = () => element.removeEventListener(event, handler);
        
        // Store cleanup function
        const key = element.dataset.listenerId || Math.random().toString(36);
        element.dataset.listenerId = key;
        this.eventListeners.set(key, cleanup);
        
        return cleanup;
    }

    async fetchWithTimeout(url, options = {}) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeout);
            return response;
        } catch (error) {
            clearTimeout(timeout);
            if (error.name === 'AbortError') {
                throw new Error('Request timed out');
            }
            throw error;
        }
    }

    handleVoiceChange(voice) {
        if (!voice) return;
        
        // Wait for next tick to ensure dropdowns are loaded
        setTimeout(() => {
            document.querySelectorAll('select[id^="voice-select"]').forEach(select => {
                if (select.options.length > 0) {
                    select.value = voice;
                }
            });
        }, 0);
    }

    init() {
        if (this.initialized) return;
        
        // Setup event listeners after DOM is ready
        const uploadNewBook = document.getElementById('upload-new-book');
        this.addEventListenerWithCleanup(uploadNewBook, 'click', () => this.showUploadView());

        // Handle back buttons with unique IDs
        document.querySelectorAll('[id^="back-to-books"]').forEach((button, index) => {
            // Ensure unique IDs
            button.id = `back-to-books-${index}`;
            this.addEventListenerWithCleanup(button, 'click', () => this.handleBack());
        });

        // Setup voice selection handling
        this.setupVoiceSelections();
        this.setupVoiceObserver();

        this.initialized = true;
        this.handleAuthStateChange();
        this.startAppInitialization();
    }

    startAppInitialization() {
        // Clear any existing interval
        if (this.appInitInterval) {
            clearInterval(this.appInitInterval);
            this.appInitInterval = null;
        }

        this.initAttempts = 0;

        // Try to initialize immediately
        if (window.app) {
            this.setApp(window.app);
            return;
        }

        // Keep trying until app is available or max attempts reached
        this.appInitInterval = setInterval(() => {
            this.initAttempts++;
            
            if (window.app) {
                this.setApp(window.app);
                clearInterval(this.appInitInterval);
                this.appInitInterval = null;
                return;
            }
            
            if (this.initAttempts >= this.maxInitAttempts) {
                console.error('Failed to initialize app after maximum attempts');
                clearInterval(this.appInitInterval);
                this.appInitInterval = null;
            }
        }, 500);
    }

    setApp(app) {
        if (!app) return;
        
        // Verify app has required methods
        const requiredMethods = ['setText', 'showTextView', 'resetTextView', 'handleVoiceChange'];
        const hasAllMethods = requiredMethods.every(method => typeof app[method] === 'function');
        
        if (!hasAllMethods) {
            console.error('App is missing required methods');
            return;
        }
        
        this.app = app;
        
        // Set initial voice selection if available (with delay to ensure options are loaded)
        if (this.app.currentVoice) {
            setTimeout(() => this.handleVoiceChange(this.app.currentVoice), 100);
        }
    }

    async handleAuthStateChange(event) {
        try {
            if (event?.detail?.isAuthenticated || auth.isAuthenticated) {
                await this.loadBooks();
                this.showBooksView();
            } else {
                this.books = [];
                this.renderBooks();
            }
        } catch (error) {
            console.error('Auth state change error:', error);
        }
    }

    async loadBooks() {
        try {
            const response = await this.fetchWithTimeout(`${API_URL}/books`, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) throw new Error('Failed to load books');
            
            this.books = await response.json();
            this.renderBooks();
        } catch (error) {
            console.error('Error loading books:', error);
            this.books = [];
            this.renderBooks();
            if (error.message === 'Request timed out') {
                alert('Network request timed out. Please check your connection and try again.');
            }
        }
    }

    renderBooks() {
        const grid = document.getElementById('books-grid');
        if (!grid) return;
        
        // Clean up existing event listeners for this grid
        this.eventListeners.forEach((cleanup, key) => {
            if (key.startsWith('grid-')) {
                cleanup();
                this.eventListeners.delete(key);
            }
        });
        
        grid.innerHTML = '';

        if (this.books.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📚</div>
                    <h3>No Books Yet</h3>
                    <p>Upload your first book to get started!</p>
                </div>
            `;
            return;
        }

        this.books.forEach(book => {
            const bookCard = document.createElement('div');
            bookCard.className = 'book-card';
            bookCard.innerHTML = `
                <div class="book-info">
                    <h3>${book.title}</h3>
                    <p class="book-date">Uploaded on ${new Date(book.upload_date).toLocaleDateString()}</p>
                </div>
                <div class="book-actions">
                    <button class="primary-button open-btn" data-book-id="${book.id}">
                        <span class="icon">📖</span> Open Book
                    </button>
                    <button class="text-button delete-btn" data-book-id="${book.id}">
                        <span class="icon">🗑️</span> Delete
                    </button>
                </div>
            `;

            // Add event listeners with cleanup tracking
            const openBtn = bookCard.querySelector('.open-btn');
            const deleteBtn = bookCard.querySelector('.delete-btn');

            if (openBtn) {
                this.addEventListenerWithCleanup(openBtn, 'click', (e) => {
                    const button = e.target.closest('.open-btn');
                    if (!button) return;
                    
                    const bookId = parseInt(button.dataset.bookId);
                    const bookToOpen = this.books.find(b => b.id === bookId);
                    if (bookToOpen) {
                        this.handleOpenBook(bookToOpen);
                    }
                });
            }

            if (deleteBtn) {
                this.addEventListenerWithCleanup(deleteBtn, 'click', (e) => {
                    const button = e.target.closest('.delete-btn');
                    if (!button) return;
                    
                    const bookId = parseInt(button.dataset.bookId);
                    this.handleDeleteBook(bookId);
                });
            }

            grid.appendChild(bookCard);
        });
    }

    async handleDeleteBook(bookId) {
        if (!confirm('Are you sure you want to delete this book?')) return;

        try {
            const response = await this.fetchWithTimeout(`${API_URL}/books/${bookId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                await this.loadBooks();
            } else {
                throw new Error('Failed to delete book');
            }
        } catch (error) {
            console.error('Error deleting book:', error);
            alert(error.message === 'Request timed out' 
                ? 'Network timeout. Please check your connection.' 
                : 'Failed to delete book. Please try again.');
        }
    }

    async generateSummary(bookId) {
        try {
            const response = await this.fetchWithTimeout(`${API_URL}/books/${bookId}/summary`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to generate summary');
            }

            const data = await response.json();
            return data.summary;
        } catch (error) {
            console.error('Error generating summary:', error);
            if (error.message === 'Request timed out') {
                throw new Error('Network timeout. Please check your connection.');
            }
            throw new Error('Failed to generate summary. Please try again.');
        }
    }

    async handleGenerateAudio(bookData) {
        try {
            let bookId;
            if (typeof bookData === 'object' && bookData !== null) {
                bookId = bookData.target?.dataset?.bookId || bookData.id;
            } else {
                bookId = parseInt(bookData);
            }

            if (!bookId) throw new Error('Invalid book ID');

            const book = this.books.find(b => b.id === parseInt(bookId));
            if (!book) throw new Error('Book not found');

            const summaryResponse = await this.generateSummary(bookId);
            
            const textContent = document.getElementById('text-content');
            if (textContent) {
                textContent.textContent = summaryResponse;
            }
            
            this.showTextView();
            this.currentBookId = bookId;
            
            if (!this.app?.setText) {
                throw new Error('Text view not initialized');
            }
            
            this.app.setText(summaryResponse);
        } catch (error) {
            console.error('Error in generate audio flow:', error);
            alert(error.message || 'Failed to generate summary. Please try again.');
        }
    }

    async handleOpenBook(book) {
        try {
            if (!book?.id) throw new Error('Invalid book data');
            if (!this.app?.showTextView) throw new Error('Text view not initialized');

            const response = await this.fetchWithTimeout(`${API_URL}/books/${book.id}`, {
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`Failed to load book: ${response.status}`);
            }

            const bookData = await response.json();
            if (!bookData?.content) throw new Error('Book data is missing content');
            
            this.currentBook = bookData;
            
            this.app.showTextView({
                title: bookData.title || 'Untitled Book',
                content: bookData.content,
                id: bookData.id
            });
            
            this.showTextView();

            // Ensure voice selection is synced after view change
            if (this.app.currentVoice) {
                setTimeout(() => this.handleVoiceChange(this.app.currentVoice), 100);
            }
        } catch (error) {
            console.error('Error in handleOpenBook:', error);
            alert(error.message === 'Request timed out'
                ? 'Network timeout. Please check your connection.'
                : error.message || 'Failed to open book');
        }
    }

    handleBack() {
        try {
            this.showBooksView();
            this.currentBook = null;
            this.app?.resetTextView?.();
        } catch (error) {
            console.error('Error in handleBack:', error);
        }
    }

    showUploadView() {
        try {
            document.querySelectorAll('.view').forEach(view => view.classList.add('hidden'));
            document.getElementById('upload-view')?.classList.remove('hidden');
        } catch (error) {
            console.error('Error showing upload view:', error);
        }
    }

    showBooksView() {
        try {
            document.querySelectorAll('.view').forEach(view => view.classList.add('hidden'));
            document.getElementById('books-view')?.classList.remove('hidden');
        } catch (error) {
            console.error('Error showing books view:', error);
        }
    }

    showTextView() {
        try {
            document.querySelectorAll('.view').forEach(view => view.classList.add('hidden'));
            document.getElementById('text-view')?.classList.remove('hidden');
        } catch (error) {
            console.error('Error showing text view:', error);
        }
    }

    setupVoiceSelections() {
        // Clean up existing voice selection listeners
        this.eventListeners.forEach((cleanup, key) => {
            if (key.startsWith('voice-select-')) {
                cleanup();
                this.eventListeners.delete(key);
            }
        });

        // Setup new listeners
        document.querySelectorAll('select[id^="voice-select"]').forEach((select, index) => {
            // Ensure unique IDs
            select.id = `voice-select-${index}`;
            
            this.addEventListenerWithCleanup(select, 'change', (e) => {
                const value = e.target.value;
                // Update other dropdowns
                document.querySelectorAll('select[id^="voice-select"]').forEach(s => {
                    if (s !== e.target && s.options.length > 0) {
                        s.value = value;
                    }
                });
                // Update app
                if (this.app?.handleVoiceChange) {
                    this.app.handleVoiceChange(value);
                }
            });

            // Set initial value if available
            if (this.app?.currentVoice && select.options.length > 0) {
                select.value = this.app.currentVoice;
            }
        });
    }

    setupVoiceObserver() {
        // Clean up existing observer
        if (this.voiceSelectObserver) {
            this.voiceSelectObserver.disconnect();
        }

        // Create new observer
        this.voiceSelectObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' || mutation.type === 'subtree') {
                    this.setupVoiceSelections();
                }
            });
        });

        // Observe both existing and future voice selects
        const observeConfig = { 
            childList: true, 
            subtree: true,
            attributes: true,
            attributeFilter: ['id']
        };

        // Observe the container elements that might contain voice selects
        ['upload-view', 'text-view'].forEach(viewId => {
            const view = document.getElementById(viewId);
            if (view) {
                this.voiceSelectObserver.observe(view, observeConfig);
            }
        });
    }
}

const books = new Books();

// Initialize immediately or on DOM load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => books.init());
} else {
    books.init();
}

export default books; 