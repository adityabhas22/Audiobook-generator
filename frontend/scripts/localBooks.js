import localStorageHandler from './localStorageHandler.js';

class LocalBooks {
    constructor() {
        this.books = [];
        this.app = null;  // Will be set after App is initialized
        this.setupEventListeners();
        this.loadBooks(); // Load books immediately
    }

    setApp(app) {
        this.app = app;
    }

    setupEventListeners() {
        document.getElementById('back-to-books').addEventListener('click', () => this.showBooksView());
    }

    async loadBooks() {
        this.books = localStorageHandler.getAllBooks();
        this.renderBooks();
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

    handleOpenBook(book) {
        if (this.app) {
            this.app.showTextView(book);
        }
    }

    async handleDeleteBook(bookId) {
        if (confirm('Are you sure you want to delete this book?')) {
            localStorageHandler.deleteBook(bookId);
            await this.loadBooks();
        }
    }

    showUploadView() {
        document.getElementById('books-view').style.display = 'none';
        document.getElementById('upload-view').style.display = 'block';
    }

    showBooksView() {
        document.getElementById('upload-view').style.display = 'none';
        document.getElementById('text-view').style.display = 'none';
        document.getElementById('books-view').style.display = 'block';
        this.loadBooks();
    }
}

const localBooks = new LocalBooks();
export default localBooks; 