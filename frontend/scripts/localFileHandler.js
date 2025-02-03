import localStorageHandler from './localStorageHandler.js';
import localBooks from './localBooks.js';

class LocalFileHandler {
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

        const dropZone = document.getElementById('drop-zone');
        const originalContent = dropZone.innerHTML;
        
        try {
            // Show loading state
            dropZone.innerHTML = `
                <div class="loading">
                    <div class="loading-icon">📚</div>
                    <p>Processing ${file.name}...</p>
                </div>
            `;
            
            // Read file content
            const content = await this.readFileContent(file);
            
            // Validate content
            if (!content || !content.trim()) {
                throw new Error('File is empty or could not be read');
            }

            // Create book data
            const bookData = {
                title: file.name.replace(/\.[^/.]+$/, ""),
                content: content
            };

            // Store in local storage
            const savedBook = localStorageHandler.addBook(bookData);
            
            // Show text view with the uploaded content
            if (localBooks.app) {
                localBooks.app.showTextView(savedBook);
            } else {
                throw new Error('App reference not found');
            }
            
        } catch (error) {
            console.error('Upload error:', error);
            // Only show error if we're still on the upload view
            if (dropZone.isConnected) {
                dropZone.innerHTML = originalContent;
            }
        }
    }

    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const content = event.target.result;
                    resolve(content);
                } catch (error) {
                    reject(new Error('Failed to read file content'));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsText(file);
        });
    }
}

// Initialize file handler
const localFileHandler = new LocalFileHandler();
export default localFileHandler; 