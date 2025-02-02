import { API_URL, MAX_SAMPLE_LENGTH } from './config.js';
import books from './books.js';

class App {
    constructor() {
        // Initialize Books
        this.books = books;
        this.books.setApp(this);
        
        // Views
        this.uploadView = document.getElementById('upload-view');
        this.textView = document.getElementById('text-view');
        
        // Voice selection (both views)
        this.voiceSelects = document.querySelectorAll('#voice-select');
        this.previewVoiceBtns = document.querySelectorAll('#preview-voice-btn');
        this.previewAudios = document.querySelectorAll('#preview-audio');
        this.voicePreviewPlayers = document.querySelectorAll('#voice-preview-player');
        
        // Text selection
        this.textContent = document.getElementById('text-content');
        this.bookTitle = document.getElementById('book-title');
        this.selectionLength = document.getElementById('selection-length');
        this.selectionInfo = document.querySelector('.selection-info');
        this.generateButton = document.getElementById('generate-btn');
        
        // Sample playback
        this.sampleAudio = document.getElementById('sample-audio');
        this.samplePlayer = document.getElementById('sample-player');
        this.downloadButton = document.getElementById('download-btn');
        
        // Navigation
        this.prevButton = document.getElementById('prev-page');
        this.nextButton = document.getElementById('next-page');
        this.currentPageSpan = document.getElementById('current-page');
        this.totalPagesSpan = document.getElementById('total-pages');
        
        this.currentSelection = { start: 0, end: 0 };
        this.pageSize = 400; // Height of visible content in pixels
        this.currentPage = 1;
        
        // Initialize state
        this.pages = [];
        this.selectedText = '';
        
        // Add tracking for used text ranges
        this.usedRanges = [];
        this.MAX_SAMPLE_LENGTH = 200;
        
        // Back buttons (handle both instances)
        this.backButtons = document.querySelectorAll('#back-to-books, .icon-button');
        
        // Bind methods
        this.handleTextSelection = this.handleTextSelection.bind(this);
        this.nextPage = this.nextPage.bind(this);
        this.prevPage = this.prevPage.bind(this);
        
        // Initialize immediately
        this.loadVoices();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Voice preview for all voice buttons
        this.previewVoiceBtns.forEach(btn => {
            btn.addEventListener('click', () => this.previewVoice());
        });
        
        // Text selection
        this.textContent?.addEventListener('mouseup', this.handleTextSelection);
        this.generateButton?.addEventListener('click', () => this.generateSample());
        
        // Navigation
        this.prevButton?.addEventListener('click', this.prevPage);
        this.nextButton?.addEventListener('click', this.nextPage);
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                this.nextPage();
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                this.prevPage();
            }
        });
        
        // Download
        this.downloadButton?.addEventListener('click', () => this.downloadSample());
        
        // Back to books grid - handle all back buttons
        this.backButtons.forEach(button => {
            button.addEventListener('click', () => this.showBooksView());
        });
    }

    async loadVoices() {
        try {
            const response = await fetch(`${API_URL}/voices`, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Failed to load voices');
            }

            const data = await response.json();
            this.populateVoiceSelect(data.voices);
        } catch (error) {
            console.error('Error loading voices:', error);
            this.voiceSelects.forEach(select => {
                select.innerHTML = '<option value="">Failed to load voices</option>';
            });
        }
    }

    populateVoiceSelect(voices) {
        if (!voices || voices.length === 0) {
            this.voiceSelects.forEach(select => {
                select.innerHTML = '<option value="">No voices available</option>';
            });
            return;
        }

        const options = voices.map(voice => 
            `<option value="${voice.voice_id}">${voice.name}</option>`
        ).join('');

        this.voiceSelects.forEach(select => {
            select.innerHTML = '<option value="">Select a voice...</option>' + options;
        });
        
        // Enable preview buttons if voices are available
        this.previewVoiceBtns.forEach(btn => {
            btn.disabled = false;
        });
    }

    async previewVoice() {
        // Get the voice select from the current view
        const currentView = document.querySelector('.view:not(.hidden)');
        const voiceSelect = currentView.querySelector('#voice-select');
        const previewPlayer = currentView.querySelector('#voice-preview-player');
        const previewAudio = currentView.querySelector('#preview-audio');

        const voiceId = voiceSelect.value;
        if (!voiceId) {
            alert('Please select a voice first.');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/voice-preview/${voiceId}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to get voice preview');
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            
            previewAudio.src = audioUrl;
            previewPlayer.classList.remove('hidden');
            previewAudio.play();
        } catch (error) {
            console.error('Error previewing voice:', error);
            alert('Failed to preview voice. Please try again.');
        }
    }

    handleTextSelection() {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        if (!range) return;

        // Only handle selections within the text content
        if (!this.textContent.contains(range.commonAncestorContainer)) return;

        const text = selection.toString().trim();
        const length = text.length;

        // Get the selection position relative to the entire text content
        const selectionStart = this.getTextOffset(range.startContainer, range.startOffset);
        const selectionEnd = this.getTextOffset(range.endContainer, range.endOffset);

        // Check if this range overlaps with any previously used range
        const isOverlapping = this.usedRanges.some(used => {
            return (selectionStart >= used.start && selectionStart <= used.end) ||
                   (selectionEnd >= used.start && selectionEnd <= used.end) ||
                   (used.start >= selectionStart && used.start <= selectionEnd);
        });

        // Update UI with selection info
        const selectionControls = document.querySelector('.selection-controls');
        
        if (length === 0) {
            selectionControls?.classList.add('hidden');
            this.generateButton.disabled = true;
            return;
        }

        // Show selection controls
        selectionControls?.classList.remove('hidden');
        
        // Update selection length
        if (this.selectionLength) {
            this.selectionLength.textContent = length.toLocaleString();
        }

        // Update generate button state based on all conditions
        this.generateButton.disabled = length === 0 || 
                                     length > this.MAX_SAMPLE_LENGTH || 
                                     isOverlapping;
        
        // Add warning if selection is invalid
        const warningSpan = document.querySelector('.selection-warning') || 
            document.createElement('span');
        warningSpan.className = 'selection-warning';
        
        if (length > this.MAX_SAMPLE_LENGTH) {
            warningSpan.textContent = ` (Max ${this.MAX_SAMPLE_LENGTH.toLocaleString()} characters)`;
            warningSpan.style.color = '#dc3545';
        } else if (isOverlapping) {
            warningSpan.textContent = ' (This text has already been used)';
            warningSpan.style.color = '#dc3545';
        } else {
            warningSpan.remove();
        }

        if (!document.querySelector('.selection-warning') && 
            (length > this.MAX_SAMPLE_LENGTH || isOverlapping)) {
            document.querySelector('.selection-info')?.appendChild(warningSpan);
        }

        // Store selection
        this.selectedText = text;
        this.currentSelection = { start: selectionStart, end: selectionEnd };
    }

    // Helper function to get text offset
    getTextOffset(node, offset) {
        const walker = document.createTreeWalker(
            this.textContent,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let currentOffset = 0;
        let currentNode = walker.nextNode();

        while (currentNode && currentNode !== node) {
            currentOffset += currentNode.length;
            currentNode = walker.nextNode();
        }

        return currentOffset + offset;
    }

    async generateSample() {
        // Get the voice select from the current view
        const currentView = document.querySelector('.view:not(.hidden)');
        const voiceSelect = currentView.querySelector('#voice-select');

        if (!this.selectedText || !voiceSelect?.value) {
            alert('Please select some text and a voice first.');
            return;
        }

        if (this.selectedText.length > this.MAX_SAMPLE_LENGTH) {
            alert(`Selection exceeds maximum length of ${this.MAX_SAMPLE_LENGTH} characters.`);
            return;
        }

        try {
            const response = await fetch(`${API_URL}/generate-sample`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: this.selectedText,
                    voice_id: voiceSelect.value
                }),
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to generate audio sample');
            }

            // Add this range to used ranges
            this.usedRanges.push({
                start: this.currentSelection.start,
                end: this.currentSelection.end
            });

            // Get the audio blob
            const audioBlob = await response.blob();
            
            // Create object URL and update audio player
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // Get the sample player from the current view
            const samplePlayer = currentView.querySelector('#sample-player');
            const sampleAudio = currentView.querySelector('#sample-audio');
            const downloadButton = currentView.querySelector('#download-btn');
            
            sampleAudio.src = audioUrl;
            samplePlayer.classList.remove('hidden');
            
            // Store for download
            this.currentAudioBlob = audioBlob;
            
            // Enable download button
            downloadButton.disabled = false;

            // Clear the selection
            window.getSelection().removeAllRanges();
            this.generateButton.disabled = true;
        } catch (error) {
            console.error('Error generating sample:', error);
            alert('Failed to generate audio sample. Please try again.');
        }
    }

    showBooksView() {
        // Reset the text view state
        this.resetTextView();
        
        // Hide text view and show books view
        if (this.textView) {
            this.textView.classList.add('hidden');
            this.textView.style.display = 'none';
        }
        const booksView = document.getElementById('books-view');
        if (booksView) {
            booksView.classList.remove('hidden');
            booksView.style.display = 'block';
        }
        
        // Reset used ranges when going back to books grid
        this.usedRanges = [];
        
        // Clean up any audio elements
        if (this.samplePlayer) {
            this.samplePlayer.classList.add('hidden');
        }
        this.voicePreviewPlayers.forEach(player => {
            if (player) player.classList.add('hidden');
        });
        this.previewAudios.forEach(audio => {
            if (audio) {
                audio.pause();
                audio.src = '';
            }
        });
        
        // Remove any keyboard event listeners
        if (this._keyboardHandler) {
            document.removeEventListener('keydown', this._keyboardHandler);
        }

        // Clear any selections
        window.getSelection().removeAllRanges();
        
        // Reset all buttons to default state
        if (this.generateButton) this.generateButton.disabled = true;
        if (this.downloadButton) this.downloadButton.disabled = true;
        
        // Reset voice selections
        this.voiceSelects.forEach(select => {
            if (select) select.selectedIndex = 0;
        });

        console.log('Navigated back to books view'); // Debug log
    }

    showTextView(book) {
        if (!book || !book.content) {
            console.error('No book content provided');
            return;
        }

        // Hide books view and upload view, show text view
        document.getElementById('books-view').classList.add('hidden');
        if (this.uploadView) this.uploadView.classList.add('hidden');
        if (this.textView) {
            this.textView.classList.remove('hidden');
            this.textView.style.display = 'block';
        }

        // Reset used ranges when opening a new book
        this.usedRanges = [];
        
        // Set book title
        if (this.bookTitle) {
            this.bookTitle.textContent = book.title || 'Untitled Book';
        }

        // Clear any existing content and reset state
        if (this.textContent) {
            this.textContent.textContent = '';
            this.pages = [];
            this.currentPage = 1;
        }

        // Initialize pagination with the book content
        this.initializePagination(book.content);

        // Log total pages created
        console.log(`Created ${this.pages.length} pages`);
        
        // Verify page content
        this.pages.forEach((content, index) => {
            console.log(`Page ${index + 1} length: ${content.length} characters`);
        });

        // Set up keyboard navigation
        document.removeEventListener('keydown', this._keyboardHandler);
        this._keyboardHandler = (e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                this.nextPage();
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                this.prevPage();
            }
        };
        document.addEventListener('keydown', this._keyboardHandler);

        // Force initial display update
        this.updatePageDisplay();
    }

    setupTextSelection() {
        if (!this.textContent) return;

        this.textContent.addEventListener('mouseup', () => {
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();

            const selectionControls = document.querySelector('.selection-controls');
            if (!selectionControls) return;

            if (selectedText) {
                // Show selection controls near the selection
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                
                selectionControls.style.display = 'block';
                selectionControls.style.top = `${rect.bottom + window.scrollY + 10}px`;
                selectionControls.style.left = `${rect.left + window.scrollX}px`;

                // Update selection length display
                const selectionLength = document.querySelector('.selection-length');
                if (selectionLength) {
                    const wordCount = selectedText.split(/\s+/).length;
                    selectionLength.textContent = `${wordCount} words selected`;
                }

                // Store selected text
                this.selectedText = selectedText;
            } else {
                // Hide selection controls if no text is selected
                selectionControls.style.display = 'none';
                this.selectedText = '';
            }
        });

        // Hide selection controls when clicking outside
        document.addEventListener('mousedown', (e) => {
            const selectionControls = document.querySelector('.selection-controls');
            if (!selectionControls) return;

            if (!selectionControls.contains(e.target) && e.target !== this.textContent) {
                selectionControls.style.display = 'none';
                this.selectedText = '';
            }
        });
    }

    initializePagination(content) {
        if (!content || !this.textContent) {
            console.error('Missing content or text container');
            return;
        }

        this.pages = [];
        this.currentPage = 1;

        // Create a temporary container with exact same styling
        const tempContainer = document.createElement('div');
        Object.assign(tempContainer.style, {
            position: 'absolute',
            visibility: 'hidden',
            width: `${this.textContent.clientWidth}px`,
            height: `${this.textContent.clientHeight}px`,
            font: window.getComputedStyle(this.textContent).font,
            fontSize: window.getComputedStyle(this.textContent).fontSize,
            lineHeight: window.getComputedStyle(this.textContent).lineHeight,
            padding: window.getComputedStyle(this.textContent).padding,
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            boxSizing: 'border-box'
        });
        document.body.appendChild(tempContainer);

        try {
            // Normalize line endings and clean up spacing
            const allText = content.replace(/\r\n/g, '\n')
                                 .replace(/\r/g, '\n')
                                 .replace(/\n\s*\n/g, '\n\n')
                                 .trim();
            
            let currentPosition = 0;
            let lastGoodBreak = 0;

            while (currentPosition < allText.length) {
                // Start with a reasonable chunk size
                let chunkSize = 1000;
                let lastFitSize = 0;
                
                // Binary search to find the maximum content that fits
                while (chunkSize > 0) {
                    const testContent = allText.substring(currentPosition, currentPosition + chunkSize);
                    tempContainer.textContent = testContent;
                    
                    if (tempContainer.scrollHeight <= tempContainer.clientHeight) {
                        lastFitSize = chunkSize;
                        chunkSize = Math.min(chunkSize + 500, allText.length - currentPosition);
                    } else {
                        chunkSize = Math.max(0, chunkSize - 100);
                    }
                }

                if (lastFitSize === 0) {
                    console.error('Could not fit any content in page');
                    break;
                }

                // Find the best break point
                let breakPoint = currentPosition + lastFitSize;
                let bestBreak = breakPoint;

                // Look back for a good break point
                for (let i = breakPoint; i > currentPosition; i--) {
                    // Check for paragraph break
                    if (allText[i] === '\n' && allText[i - 1] === '\n') {
                        bestBreak = i;
                        break;
                    }
                    // Check for sentence end
                    if (allText[i - 1] === '.' && (allText[i] === ' ' || allText[i] === '\n')) {
                        bestBreak = i;
                        break;
                    }
                    // Check for word break
                    if (allText[i] === ' ') {
                        bestBreak = i;
                        break;
                    }
                }

                // If we couldn't find a good break point, use the last fit size
                if (bestBreak === breakPoint) {
                    bestBreak = currentPosition + lastFitSize;
                }

                // Extract the page content
                const pageContent = allText.substring(currentPosition, bestBreak).trim();
                if (pageContent) {
                    this.pages.push(pageContent);
                    console.log(`Added page ${this.pages.length} with ${pageContent.length} characters`);
                }

                // Move to next position
                currentPosition = bestBreak;
                // Skip any whitespace or newlines
                while (currentPosition < allText.length && 
                       (allText[currentPosition] === ' ' || allText[currentPosition] === '\n')) {
                    currentPosition++;
                }

                // Safety check to prevent infinite loops
                if (currentPosition <= lastGoodBreak) {
                    console.error('Pagination not advancing, breaking to prevent infinite loop');
                    break;
                }
                lastGoodBreak = currentPosition;
            }
        } finally {
            document.body.removeChild(tempContainer);
        }

        // Update display
        this.updatePageDisplay();
        console.log(`Pagination complete: ${this.pages.length} pages created`);
    }

    updatePageDisplay() {
        if (!this.textContent || this.pages.length === 0) {
            console.error('No content or pages to display');
            return;
        }

        // Ensure currentPage is within bounds
        this.currentPage = Math.max(1, Math.min(this.currentPage, this.pages.length));
        const pageIndex = this.currentPage - 1;

        // Update content with smooth transition
        this.textContent.style.opacity = '0';
        setTimeout(() => {
            this.textContent.textContent = this.pages[pageIndex];
            this.textContent.style.opacity = '1';
        }, 150);

        // Update page counter
        const pageCounter = document.querySelector('.page-counter');
        if (pageCounter) {
            pageCounter.textContent = `Page ${this.currentPage} of ${this.pages.length}`;
        }

        // Update navigation buttons
        if (this.prevButton) {
            this.prevButton.disabled = this.currentPage <= 1;
        }
        if (this.nextButton) {
            this.nextButton.disabled = this.currentPage >= this.pages.length;
        }
    }

    nextPage() {
        if (this.currentPage < this.pages.length) {
            this.currentPage++;
            this.updatePageDisplay();
            console.log(`Navigated to page ${this.currentPage} of ${this.pages.length}`);
        }
    }

    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updatePageDisplay();
            console.log(`Navigated to page ${this.currentPage} of ${this.pages.length}`);
        }
    }

    resetTextView() {
        // Clear content
        this.textContent.textContent = '';
        
        // Reset title
        this.bookTitle.textContent = '';
        
        // Reset UI state
        this.resetSelectionState();
        
        // Hide audio players
        this.samplePlayer.classList.add('hidden');
        this.voicePreviewPlayers.forEach(player => player.classList.add('hidden'));
        this.previewAudios.forEach(audio => audio.src = '');
    }

    resetSelectionState() {
        // Reset selection UI
        this.selectionInfo.classList.add('hidden');
        if (this.selectionLength) {
            this.selectionLength.textContent = '0';
        }
        
        // Reset buttons
        this.generateButton.disabled = true;
        this.downloadButton.disabled = true;
        
        // Clear selection data
        this.selectedText = '';
        this.currentSelection = { start: 0, end: 0 };
    }

    showUploadView() {
        this.textView.classList.add('hidden');
        this.uploadView.classList.remove('hidden');
        this.samplePlayer.classList.add('hidden');
        this.generateButton.disabled = true;
    }

    downloadSample() {
        if (this.currentAudioBlob) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(this.currentAudioBlob);
            a.download = 'audiobook-sample.mp3';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    }
}

// Initialize and export the app instance
const app = new App();
export default app; 