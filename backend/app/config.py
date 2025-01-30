from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List
import os

class Settings(BaseSettings):
    """Application settings"""
    # API Settings
    api_title: str = "Audiobook Generator API"
    api_description: str = "API for generating audiobook samples using ElevenLabs TTS"
    
    # ElevenLabs Settings
    elevenlabs_api_key: str
    default_voice: str = "Adam"
    max_text_length: int = 500  # Maximum number of characters for sample
    
    # CORS Settings
    allowed_origins: List[str] = []

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Default origins for development
        default_origins = [
            "http://localhost:3000",
            "http://localhost:8000",
            "https://*.vercel.app"
        ]
        
        # Get origins from environment variable if set
        env_origins = os.getenv("ALLOWED_ORIGINS")
        if env_origins:
            self.allowed_origins = env_origins.split(",")
        else:
            self.allowed_origins = default_origins
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

@lru_cache()
def get_settings() -> Settings:
    """Get cached settings"""
    return Settings() 