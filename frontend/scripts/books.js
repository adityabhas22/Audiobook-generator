import { API_URL } from './config.js';
import auth from './auth.js';

class Books {
    constructor() {
        this.books = [];
        this.app = null;  // Will be set after App is initialized
        this.setupEventListeners();
        this.handleAuthStateChange();
    }

    setApp(app) {
        this.app = app;
    }

    setupEventListeners() {
        document.addEventListener('authStateChanged', (e) => this.handleAuthStateChange(e));
        document.getElementById('upload-new-book').addEventListener('click', () => this.showUploadView());
        document.getElementById('back-to-books').addEventListener('click', () => this.showBooksView());
    }

    async handleAuthStateChange(event) {
        if (event?.detail?.isAuthenticated || auth.isAuthenticated) {
            await this.loadBooks();
            this.showBooksView();
        } else {
            this.books = [];
            this.renderBooks();
        }
    }

    async loadBooks() {
        try {
            const response = await fetch(`${API_URL}/books`, {
                credentials: 'include'
            });
            if (response.ok) {
                this.books = await response.json();
                this.renderBooks();
            }
        } catch (error) {
            console.error('Error loading books:', error);
        }
    }

    renderBooks() {
        const grid = document.getElementById('books-grid');
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

            // Add event listeners
            bookCard.querySelector('.open-btn').addEventListener('click', (e) => {
                // Find the closest button element
                const button = e.target.closest('.open-btn');
                if (!button) return;
                
                const bookId = parseInt(button.dataset.bookId);
                const bookToOpen = this.books.find(b => b.id === bookId);
                if (bookToOpen) {
                    this.handleOpenBook(bookToOpen);
                }
            });
            
            bookCard.querySelector('.delete-btn').addEventListener('click', (e) => {
                const button = e.target.closest('.delete-btn');
                if (!button) return;
                
                const bookId = parseInt(button.dataset.bookId);
                this.handleDeleteBook(bookId);
            });

            grid.appendChild(bookCard);
        });
    }

    async handleDeleteBook(bookId) {
        if (!confirm('Are you sure you want to delete this book?')) return;

        try {
            const response = await fetch(`${API_URL}/books/${bookId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                await this.loadBooks();
            }
        } catch (error) {
            console.error('Error deleting book:', error);
            alert('Failed to delete book. Please try again.');
        }
    }

    async generateSummary(bookId) {
        try {
            const response = await fetch(`${API_URL}/books/${bookId}/summary`, {
                method: 'POST',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to generate summary');
            }

            const data = await response.json();
            return data.summary;
        } catch (error) {
            console.error('Error generating summary:', error);
            throw error;
        }
    }

    async handleGenerateAudio(event) {
        const bookId = event.target.dataset.bookId;
        const book = this.books.find(b => b.id === parseInt(bookId));
        
        if (!book) {
            console.error('Book not found');
            return;
        }

        try {
            // First generate summary
            const summary = await this.generateSummary(bookId);
            
            // Update the text view with the summary
            const textView = document.getElementById('textView');
            textView.value = summary;
            
            // Show the text view container
            document.getElementById('textViewContainer').style.display = 'block';
            document.getElementById('booksContainer').style.display = 'none';
            
            // Store the current book ID for navigation
            this.currentBookId = bookId;
            
            // Initialize the app with the summary
            window.app.setText(summary);
        } catch (error) {
            console.error('Error in generate audio flow:', error);
            alert('Failed to generate summary. Please try again.');
        }
    }

    async handleOpenBook(book) {
        try {
            console.log('Opening book:', book);
            
            if (!book || !book.id) {
                throw new Error('Invalid book data');
            }

            // Fetch the book with its content
            const response = await fetch(`${API_URL}/books/${book.id}`, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server response:', response.status, errorText);
                throw new Error(`Failed to load book: ${response.status} ${response.statusText}`);
            }

            const bookData = await response.json();
            console.log('Received book data:', bookData);
            
            if (!bookData || !bookData.content) {
                throw new Error('Book data is missing required fields');
            }
            
            // Store current book
            this.currentBook = bookData;
            
            // Make sure app is initialized
            if (!this.app) {
                console.error('App reference is missing');
                throw new Error('App not initialized');
            }
            
            // Create a properly formatted book object
            const formattedBook = {
                title: bookData.title || 'Untitled Book',
                content: bookData.content,
                id: bookData.id
            };
            
            console.log('Formatted book:', formattedBook);
            
            // Initialize the text view with pagination
            this.app.showTextView(formattedBook);
            
            // Show text view and hide books view
            const booksView = document.getElementById('books-view');
            const textView = document.getElementById('text-view');
            
            if (!booksView || !textView) {
                throw new Error('Required view elements not found');
            }
            
            booksView.classList.add('hidden');
            textView.classList.remove('hidden');
            
        } catch (error) {
            console.error('Detailed error in handleOpenBook:', error);
            console.error('Error stack:', error.stack);
            alert(`Failed to open book: ${error.message}`);
        }
    }

    handleBack() {
        // Show books view and hide text view
        document.getElementById('text-view').classList.add('hidden');
        document.getElementById('books-view').classList.remove('hidden');
        
        // Clear the current book
        this.currentBook = null;
        
        // Reset the app state
        if (this.app) {
            this.app.resetTextView();
        }
    }

    showUploadView() {
        document.querySelectorAll('.view').forEach(view => view.classList.add('hidden'));
        document.getElementById('upload-view').classList.remove('hidden');
    }

    showBooksView() {
        document.querySelectorAll('.view').forEach(view => view.classList.add('hidden'));
        document.getElementById('books-view').classList.remove('hidden');
    }
}

// Export the Books class instead of an instance
export { Books }; 