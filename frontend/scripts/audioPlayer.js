class AudioPlayer {
    constructor() {
        this.audioElement = document.getElementById('audio-element');
        this.downloadButton = document.getElementById('download-btn');
        this.audioPlayer = document.getElementById('audio-player');
        this.currentAudioBlob = null;

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.downloadButton.addEventListener('click', () => this.downloadAudio());
    }

    setAudioSource(audioBlob) {
        this.currentAudioBlob = audioBlob;
        const audioUrl = URL.createObjectURL(audioBlob);
        this.audioElement.src = audioUrl;
        this.audioPlayer.classList.remove('hidden');
    }

    downloadAudio() {
        if (!this.currentAudioBlob) return;

        const downloadUrl = URL.createObjectURL(this.currentAudioBlob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = 'audiobook-sample.mp3';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
    }
}

// Initialize the audio player
const audioPlayer = new AudioPlayer(); 