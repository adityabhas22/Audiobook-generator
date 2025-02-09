# Audiobook Sample Generator

A full-stack application that allows users to generate audio samples from text using ElevenLabs' text-to-speech API. The application provides both public and authenticated endpoints for processing text and generating audio samples.

## Features

### Backend API Routes

#### Public Endpoints (No Authentication Required)

1. `GET /voices`
   - Fetches available voices from ElevenLabs
   - Returns a list of available voices with their IDs and names

2. `POST /public/generate-audio`
   - Generates audio from text without authentication
   - Limited to 500 characters
   - Parameters:
     - `text`: The text to convert to speech
     - `voice_id`: (Optional) Specific voice to use

3. `POST /public/process-book`
   - Processes a book without authentication
   - Limited to 500 characters
   - Parameters:
     - `title`: Book title
     - `content`: Book content
     - `voice_id`: (Optional) Specific voice to use

4. `POST /public/upload`
   - Upload and process a file without authentication
   - Supports .txt and .epub files
   - Limited to 500 characters
   - Returns extracted content

#### Voice Preview

`GET /voice-preview/{voice_id}`
- Get a quick preview of a specific voice
- Uses a standard sample text
- Returns audio stream

#### Book Management Endpoints

1. `GET /books`
   - Get all books for the current user

2. `POST /books`
   - Create a new book
   - Parameters:
     - `title`: Book title
     - `content`: Book content

3. `GET /books/{book_id}`
   - Get a specific book

4. `PUT /books/{book_id}`
   - Update a book
   - Parameters:
     - `title`: (Optional) New title
     - `content`: (Optional) New content
     - `last_voice_id`: (Optional) Last used voice
     - `voice_settings`: (Optional) Voice configuration

5. `DELETE /books/{book_id}`
   - Delete a specific book

#### Audio Generation

`POST /generate-sample`
- Generate an audio sample using ElevenLabs TTS
- Parameters:
  - `text`: Full text content
  - `voice_id`: (Optional) Voice to use
  - `start_position`: (Optional) Start position for text selection
  - `end_position`: (Optional) End position for text selection

### Frontend Features

#### Book Management
- Grid view of all books
- Add new books through file upload
- Support for .txt and .epub files
- Delete existing books

#### Text Editor
- Page-based navigation
- Text selection for audio generation
- Character count tracking


#### Voice Management
- Voice selection dropdown
- Voice preview functionality
- Sample generation from selected text
- Download generated audio samples

#### User Interface
- Modern, responsive design
- Drag and drop file upload
- Audio player controls
- Navigation between views:
  - Books grid
  - Upload view
  - Text editor view

## Technical Details

### API Response Formats

- Voice Response:
```json
{
    "voices": [
        {
            "voice_id": "string",
            "name": "string"
        }
    ]
}
```

- Book Response:
```json
{
    "id": "number",
    "title": "string",
    "content": "string",
    "last_voice_id": "string",
    "voice_settings": "object"
}
```

### Limitations
- Public endpoints are limited to 500 characters
- Supported file formats: .txt, .epub
- Maximum sample length for audio generation: 200 characters per selection
- Larger books may not work due to localStorage limits.
