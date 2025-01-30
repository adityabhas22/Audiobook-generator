from elevenlabs import generate, voices, set_api_key
from typing import List
from fastapi import HTTPException
from app.config import get_settings
from app.models import Voice

settings = get_settings()

# Set API key
set_api_key(settings.elevenlabs_api_key)

async def generate_audio(text: str, voice_id: str | None = None) -> bytes:
    """
    Generate audio from text using ElevenLabs API
    
    Args:
        text: The text to convert to speech
        voice_id: Optional voice ID to use (defaults to settings.default_voice)
    
    Returns:
        bytes: The generated audio data
        
    Raises:
        HTTPException: If there's an error generating the audio
    """
    try:
        # Ensure text is within limits
        if len(text) > settings.max_text_length:
            text = text[:settings.max_text_length]
        
        audio = generate(
            text=text,
            voice=voice_id if voice_id else settings.default_voice,
            model="eleven_monolingual_v1"
        )
        return audio
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating audio: {str(e)}"
        )

async def get_available_voices() -> List[Voice]:
    """
    Get list of available voices from ElevenLabs
    
    Returns:
        List[Voice]: List of available voices
        
    Raises:
        HTTPException: If there's an error fetching voices
    """
    try:
        available_voices = voices()
        return [
            Voice(
                voice_id=voice.voice_id,
                name=voice.name,
                description=voice.description
            )
            for voice in available_voices
        ]
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching voices: {str(e)}"
        ) 