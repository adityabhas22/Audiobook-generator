import { API_URL } from './config.js';
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
        if (!file.name.endsWith('.txt') && !file.name.endsWith('.epub')) {
            alert('Please upload a .txt or .epub file');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Use the public endpoint instead
            const response = await fetch(`${API_URL}/public/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const bookData = await response.json();
            
            // Show text view with the uploaded content
            if (books.app) {
                books.app.showTextView({
                    title: bookData.title,
                    content: bookData.content
                });
            } else {
                console.error('App reference not found');
            }
            
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload file. Please try again.');
        }
    }
}

// Initialize file handler
const fileHandler = new FileHandler();
export default fileHandler; 