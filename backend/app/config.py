from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    """Application settings"""
    # API Settings
    api_title: str = "Audiobook Generator API"
    api_description: str = "API for generating audiobook samples using ElevenLabs TTS"
    
    # ElevenLabs Settings
    elevenlabs_api_key: str
    default_voice: str = "Adam"
    max_text_length: int = 500  # Maximum number of characters for sample
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

@lru_cache()
def get_settings() -> Settings:
    """Get cached settings"""
    return Settings()

def get_allowed_origins():
    """Get allowed origins for CORS"""
    return [
        "http://localhost:3000",
        "http://localhost:8000",
        "https://audiobook-generator-two.vercel.app"
    ] 