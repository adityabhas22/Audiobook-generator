// API configuration
export const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:8000/api'
    : 'https://audiobook-generator-backend.onrender.com/api';

// Text selection configuration
export const MAX_SAMPLE_LENGTH = 5000;  // Maximum characters for audio sample 