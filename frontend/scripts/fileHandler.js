import { API_URL } from './config.js';
import auth from './auth.js';
import books from './books.js';

class FileHandler {
    constructor() {
        this.setupDropZone();
        this.setupFileInput();
    }

    setupDropZone() {
        const dropZone = document.getElementById('drop-zone');
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            
            const file = e.dataTransfer.files[0];
            if (file) {
                await this.handleFile(file);
            }
        });
    }

    setupFileInput() {
        const fileInput = document.getElementById('file-input');
        const selectButton = document.getElementById('select-file-btn');
        
        selectButton.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.handleFile(file);
            }
        });
    }

    async handleFile(file) {
        if (!auth.isAuthenticated) {
            alert('Please sign in to upload books');
            return;
        }

        if (!file.name.endsWith('.txt') && !file.name.endsWith('.epub')) {
            alert('Please upload a .txt or .epub file');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const book = await response.json();
            
            // Refresh books list and show text view
            await books.loadBooks();
            books.handleGenerateAudio(book);
            
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload file. Please try again.');
        }
    }
}

// Initialize file handler
const fileHandler = new FileHandler();
export default fileHandler; 