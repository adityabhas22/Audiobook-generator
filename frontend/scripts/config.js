// API configuration
export const API_URL = process.env.NODE_ENV === 'production' 
    ? 'https://audiobook-generator-backend.onrender.com/api'
    : 'http://localhost:8000/api';

// Text selection configuration
export const MAX_SAMPLE_LENGTH = 5000;  // Maximum characters for audio sample 