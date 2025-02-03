// API configuration
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
export const API_URL = isProduction 
    ? 'https://audiobook-generator-w1tf.onrender.com/api'
    : 'http://localhost:8000/api';

// Text selection configuration
export const MAX_SAMPLE_LENGTH = 5000;  // Maximum characters for audio sample 