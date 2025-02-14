import { API_URL, MAX_SAMPLE_LENGTH } from './config.js';
import localBooks from './localBooks.js';

class App {
    constructor() {
        // Initialize Books
        this.books = localBooks;
        this.books.setApp(this);
        
        // Views
        this.uploadView = document.getElementById('upload-view');
        this.textView = document.getElementById('text-view');
        
        // Voice selection (both views)
        this.voiceSelects = [
            document.getElementById('upload-voice-select'),
            document.getElementById('text-voice-select')
        ];
        this.previewVoiceBtns = document.querySelectorAll('.preview-voice-btn');
        
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
        this.previewVoice = this.previewVoice.bind(this);
        
        // Initialize immediately
        this.loadVoices();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Voice preview for all voice buttons
        this.previewVoiceBtns.forEach(btn => {
            btn.addEventListener('click', this.previewVoice);
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
            button.addEventListener('click', () => localBooks.showBooksView());
        });

        // Add New Book button
        const uploadNewBookBtn = document.getElementById('upload-new-book');
        if (uploadNewBookBtn) {
            uploadNewBookBtn.addEventListener('click', () => localBooks.showUploadView());
        }
    }

    async loadVoices() {
        try {
            const response = await fetch(`${API_URL}/voices`, {
                credentials: 'include'  // Include credentials for CORS
            });
            
            if (!response.ok) {
                throw new Error(`Failed to load voices: ${response.statusText}`);
            }

            const data = await response.json();
            // Handle both array format and object format with voices property
            const voices = Array.isArray(data) ? data : data.voices || [];
            this.updateVoiceSelects(voices);
        } catch (error) {
            console.error('Error loading voices:', error);
            // Update UI to show error state
            this.voiceSelects.forEach(select => {
                select.innerHTML = '<option value="">Failed to load voices</option>';
            });
        }
    }

    updateVoiceSelects(voices) {
        if (!Array.isArray(voices) || voices.length === 0) {
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
    }

    async previewVoice(event) {
        const button = event.target.closest('.preview-voice-btn');
        if (!button) return;

        // Determine which view we're in
        const isUploadView = button.closest('#upload-view') !== null;
        
        // Get the appropriate elements
        const voiceSelect = isUploadView ? 
            document.getElementById('upload-voice-select') : 
            document.getElementById('text-voice-select');
            
        const previewPlayer = isUploadView ? 
            document.getElementById('upload-preview-player') : 
            document.getElementById('text-preview-player');
            
        const previewAudio = isUploadView ? 
            document.getElementById('upload-preview-audio') : 
            document.getElementById('text-preview-audio');

        const voiceId = voiceSelect.value;
        if (!voiceId) {
            alert('Please select a voice first.');
            return;
        }

        try {
            console.log('Fetching voice preview for voice ID:', voiceId);
            const response = await fetch(`${API_URL}/voice-preview/${voiceId}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to get voice preview');
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            
            previewAudio.src = audioUrl;
            previewPlayer.style.display = 'block';
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
        // Get the voice select from the text view specifically
        const voiceSelect = document.getElementById('text-voice-select');
        const voiceId = voiceSelect?.value;

        if (!this.selectedText || !voiceId) {
            alert('Please select some text and a voice first.');
            return;
        }

        if (!this.selectedText) {
            alert('Please select some text');
            return;
        }

        if (!voiceId) {
            alert('Please select a voice first.');
            return;
        }

        if (this.selectedText.length > this.MAX_SAMPLE_LENGTH) {
            alert(`Selection exceeds maximum length of ${this.MAX_SAMPLE_LENGTH} characters.`);
            return;
        }

        try {
            console.log('Generating sample with:', {
                text: this.selectedText,
                voiceId: voiceId
            });

            const response = await fetch(`${API_URL}/generate-sample`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    text: this.selectedText,
                    voice_id: voiceId
                })
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
            
            // Update the audio player
            this.sampleAudio.src = audioUrl;
            this.samplePlayer.style.display = 'block';
            
            // Store for download
            this.currentAudioBlob = audioBlob;
            
            // Enable download button
            this.downloadButton.disabled = false;

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
        this.previewVoiceBtns.forEach(btn => {
            if (btn) btn.classList.add('hidden');
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
        // Hide other views
        this.uploadView.style.display = 'none';
        document.getElementById('books-view').style.display = 'none';
        
        // Update content
        this.bookTitle.textContent = book.title;
        this.textContent.textContent = book.content;
        
        // Show text view
        this.textView.style.display = 'block';
        
        // Reset state and initialize pagination
        this.currentPage = 1;
        this.initializePagination(book.content);
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
      
        // Create a temporary container with the same styling as the text container
        const tempContainer = document.createElement('div');
        const computedStyle = window.getComputedStyle(this.textContent);
        Object.assign(tempContainer.style, {
          position: 'absolute',
          visibility: 'hidden',
          width: `${this.textContent.clientWidth}px`,
          height: `${this.textContent.clientHeight}px`,
          font: computedStyle.font,
          fontSize: computedStyle.fontSize,
          lineHeight: computedStyle.lineHeight,
          padding: computedStyle.padding,
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          boxSizing: 'border-box'
        });
        document.body.appendChild(tempContainer);
      
        try {
          // Normalize line endings and clean up spacing
          const allText = content
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\n\s*\n/g, '\n\n')
            .trim();
      
          let currentPosition = 0;
          while (currentPosition < allText.length) {
            // Use binary search to determine the maximum number of characters
            // that can fit in the container.
            let low = 1; // at least one character
            let high = allText.length - currentPosition;
            let fitLength = 0;
      
            while (low <= high) {
              const mid = Math.floor((low + high) / 2);
              const testContent = allText.substring(currentPosition, currentPosition + mid);
              tempContainer.textContent = testContent;
      
              if (tempContainer.scrollHeight <= tempContainer.clientHeight) {
                // The content fits. Try a larger chunk.
                fitLength = mid;
                low = mid + 1;
              } else {
                // Too much content – reduce the size.
                high = mid - 1;
              }
            }
      
            if (fitLength === 0) {
              console.error('Could not fit any content in the page.');
              break;
            }
      
            // Determine a natural break point within the fitted content.
            let breakPoint = currentPosition + fitLength;
            let bestBreak = breakPoint;
      
            // Search backwards for a natural break: double newline, sentence end, or a space.
            for (let i = breakPoint; i > currentPosition; i--) {
              if (allText[i] === '\n' && allText[i - 1] === '\n') {
                bestBreak = i;
                break;
              }
              if (allText[i - 1] === '.' && (allText[i] === ' ' || allText[i] === '\n')) {
                bestBreak = i;
                break;
              }
              if (allText[i] === ' ') {
                bestBreak = i;
                break;
              }
            }
            // If no good break is found, default to the maximum that fits.
            if (bestBreak <= currentPosition) {
              bestBreak = breakPoint;
            }
      
            // Extract the content for this page.
            const pageContent = allText.substring(currentPosition, bestBreak).trim();
            if (pageContent) {
              this.pages.push(pageContent);
              console.log(`Added page ${this.pages.length} with ${pageContent.length} characters`);
            }
      
            // Move the current position forward and skip any extra whitespace/newlines.
            currentPosition = bestBreak;
            while (currentPosition < allText.length && 
                   (allText[currentPosition] === ' ' || allText[currentPosition] === '\n')) {
              currentPosition++;
            }
          }
        } finally {
          // Clean up the temporary container.
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
        this.previewVoiceBtns.forEach(btn => btn.classList.add('hidden'));
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

// Initialize app
const app = new App();
export default app; 