import config from './config.js';
import app from './app.js';

class FileHandler {
    constructor() {
        this.dropZone = document.getElementById('drop-zone');
        this.fileInput = document.getElementById('file-input');
        this.selectButton = document.getElementById('select-file-btn');
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Drag and drop events
        this.dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.dropZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.dropZone.addEventListener('drop', (e) => this.handleDrop(e));

        // Click to select file
        this.selectButton.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        this.dropZone.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        this.dropZone.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        this.dropZone.classList.remove('drag-over');

        const file = e.dataTransfer.files[0];
        this.processFile(file);
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        this.processFile(file);
    }

    async processFile(file) {
        if (!file) return;

        if (!file.name.match(/\.(txt|epub)$/)) {
            alert('Please upload a .txt or .epub file');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${config.API_URL}/api/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data = await response.json();
            app.showTextView(data.content);
        } catch (error) {
            console.error('Error:', error);
            alert('Error uploading file');
        }
    }
}

// Initialize the file handler
const fileHandler = new FileHandler(); 