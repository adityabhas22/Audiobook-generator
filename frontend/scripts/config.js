// API configuration
const isProd = window.location.hostname !== 'localhost';
export const API_URL = isProd 
    ? 'https://audiobook-generator-w1tf.onrender.com/api'
    : 'http://localhost:8000/api';

// Text selection configuration
export const MAX_SAMPLE_LENGTH = 5000;  // Maximum characters for audio sample 