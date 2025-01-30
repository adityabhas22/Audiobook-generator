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
    # Default origins for development and production
    allowed_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "https://audiobook-generator-two.vercel.app"
    ]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    def get_cors_origins(self) -> List[str]:
        """Get CORS origins from environment or use defaults"""
        env_origins = os.getenv("ALLOWED_ORIGINS")
        if env_origins:
            return [origin.strip() for origin in env_origins.split(",")]
        return self.allowed_origins

@lru_cache()
def get_settings() -> Settings:
    """Get cached settings"""
    return Settings() 