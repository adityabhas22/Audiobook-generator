export class LocalStorageHandler {
    constructor() {
        this.STORAGE_KEY = 'audiobook_library';
        this.initializeStorage();
    }

    initializeStorage() {
        if (!localStorage.getItem(this.STORAGE_KEY)) {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify([]));
        }
    }

    getAllBooks() {
        return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || [];
    }

    addBook(bookData) {
        const books = this.getAllBooks();
        const newBook = {
            id: Date.now(),
            title: bookData.title,
            content: bookData.content,
            upload_date: new Date().toISOString()
        };
        books.push(newBook);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(books));
        return newBook;
    }

    getBook(id) {
        const books = this.getAllBooks();
        return books.find(book => book.id === id);
    }

    deleteBook(id) {
        const books = this.getAllBooks();
        const filteredBooks = books.filter(book => book.id !== id);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredBooks));
    }
}

export default new LocalStorageHandler(); 