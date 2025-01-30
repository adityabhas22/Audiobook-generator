import config from './config.js';

class App {
    constructor() {
        // Views
        this.uploadView = document.getElementById('upload-view');
        this.textView = document.getElementById('text-view');
        
        // Voice selection
        this.voiceSelect = document.getElementById('voice-select');
        this.previewVoiceBtn = document.getElementById('preview-voice-btn');
        this.previewAudio = document.getElementById('preview-audio');
        this.voicePreviewPlayer = document.getElementById('voice-preview-player');
        
        // Text selection
        this.textContent = document.getElementById('text-content');
        this.selectionLength = document.getElementById('selection-length');
        this.selectionInfo = document.querySelector('.selection-info');
        this.generateButton = document.getElementById('generate-btn');
        
        // Sample playback
        this.sampleAudio = document.getElementById('sample-audio');
        this.samplePlayer = document.getElementById('sample-player');
        this.downloadButton = document.getElementById('download-btn');
        
        // Navigation
        this.backButton = document.getElementById('back-to-upload');
        
        this.currentSelection = { start: 0, end: 0 };
        this.loadVoices();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Voice preview
        this.previewVoiceBtn.addEventListener('click', () => this.previewVoice());
        
        // Text selection
        this.textContent.addEventListener('mouseup', () => this.handleTextSelection());
        this.generateButton.addEventListener('click', () => this.generateSample());
        
        // Navigation
        this.backButton.addEventListener('click', () => this.showUploadView());
        
        // Download
        this.downloadButton.addEventListener('click', () => this.downloadSample());

        // Scroll navigation
        document.getElementById('scroll-top')?.addEventListener('click', () => {
            this.textContent.scrollTo({ top: 0, behavior: 'smooth' });
        });
        
        document.getElementById('scroll-bottom')?.addEventListener('click', () => {
            this.textContent.scrollTo({ 
                top: this.textContent.scrollHeight, 
                behavior: 'smooth' 
            });
        });

        // Track scroll progress
        this.textContent.addEventListener('scroll', () => {
            const progress = this.textContent.scrollTop / 
                (this.textContent.scrollHeight - this.textContent.clientHeight);
            const progressBar = document.querySelector('.scroll-progress');
            if (progressBar) {
                const containerHeight = document.querySelector('.scroll-indicator').clientHeight;
                progressBar.style.height = `${containerHeight * 0.2}px`;  // 20% of container height
                progressBar.style.top = `${progress * (containerHeight - progressBar.clientHeight)}px`;
            }
        });
    }

    async loadVoices() {
        try {
            console.log('Fetching voices from:', `${config.API_URL}/api/voices`);
            const response = await fetch(`${config.API_URL}/api/voices`);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server response:', errorText);
                throw new Error(`Failed to load voices: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Received voices:', data);
            
            if (!data || !Array.isArray(data.voices)) {
                throw new Error('Invalid response format');
            }

            this.populateVoiceSelect(data.voices);
        } catch (error) {
            console.error('Detailed error:', error);
            alert('Error loading voices. Check console for details.');
        }
    }

    populateVoiceSelect(voices) {
        this.voiceSelect.innerHTML = '';
        voices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.voice_id;
            option.textContent = voice.name;
            this.voiceSelect.appendChild(option);
        });
    }

    async previewVoice() {
        const voiceId = this.voiceSelect.value;
        if (!voiceId) return;

        try {
            const response = await fetch(`${config.API_URL}/api/voice-preview/${voiceId}`);
            if (!response.ok) {
                throw new Error('Failed to generate preview');
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            this.previewAudio.src = audioUrl;
            this.voicePreviewPlayer.classList.remove('hidden');
            this.previewAudio.play();
        } catch (error) {
            console.error('Error previewing voice:', error);
            alert('Error generating voice preview');
        }
    }

    handleTextSelection() {
        const selection = window.getSelection();
        const text = selection.toString().trim();
        const MAX_SAMPLE_LENGTH = 500;

        if (text) {
            const range = selection.getRangeAt(0);
            this.currentSelection = {
                start: this.getTextOffset(range.startContainer, range.startOffset),
                end: this.getTextOffset(range.endContainer, range.endOffset)
            };
            
            const selectionLength = text.length;
            this.selectionLength.textContent = `${selectionLength}/${MAX_SAMPLE_LENGTH}`;
            this.selectionInfo.classList.remove('hidden');
            this.generateButton.disabled = selectionLength > MAX_SAMPLE_LENGTH;
            
            if (selectionLength > MAX_SAMPLE_LENGTH) {
                alert(`Selection too long. Maximum length is ${MAX_SAMPLE_LENGTH} characters.`);
            }
        } else {
            this.currentSelection = { start: 0, end: 0 };
            this.selectionInfo.classList.add('hidden');
            this.generateButton.disabled = true;
        }
    }

    getTextOffset(node, offset) {
        let totalOffset = 0;
        const walker = document.createTreeWalker(
            this.textContent,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        while (walker.nextNode()) {
            if (walker.currentNode === node) {
                return totalOffset + offset;
            }
            totalOffset += walker.currentNode.length;
        }
        return totalOffset;
    }

    async generateSample() {
        const voiceId = this.voiceSelect.value;
        if (!voiceId || this.currentSelection.start === this.currentSelection.end) return;

        const text = this.textContent.textContent;
        
        try {
            const response = await fetch(`${config.API_URL}/api/generate-sample`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'audio/mpeg',
                    'Origin': window.location.origin
                },
                body: JSON.stringify({
                    text: text,
                    voice_id: voiceId,
                    start_position: this.currentSelection.start,
                    end_position: this.currentSelection.end
                })
            });

            if (!response.ok) {
                throw new Error('Failed to generate sample');
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            this.sampleAudio.src = audioUrl;
            this.samplePlayer.classList.remove('hidden');
            this.sampleAudio.play();
        } catch (error) {
            console.error('Error generating sample:', error);
            alert('Error generating audio sample');
        }
    }

    showTextView(content) {
        this.uploadView.classList.add('hidden');
        this.textView.classList.remove('hidden');
        this.textContent.textContent = content;
    }

    showUploadView() {
        this.textView.classList.add('hidden');
        this.uploadView.classList.remove('hidden');
        this.samplePlayer.classList.add('hidden');
        this.generateButton.disabled = true;
    }

    downloadSample() {
        if (this.sampleAudio.src) {
            const a = document.createElement('a');
            a.href = this.sampleAudio.src;
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