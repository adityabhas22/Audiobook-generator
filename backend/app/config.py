from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List, Optional
import os

class Settings(BaseSettings):
    """Application settings"""
    # Environment
    ENV: str = "development"  # development or production
    
    # API Settings
    api_title: str = "Audiobook Generator API"
    api_description: str = "API for generating audiobook samples using ElevenLabs TTS"
    
    # Domain Settings
    FRONTEND_URL: str = "http://localhost:3000"  # Default for development
    BACKEND_URL: str = "http://localhost:8000"   # Default for development
    
    # CORS Settings
    allowed_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8000",
        "https://audiobook-generator-two.vercel.app",
        "https://audiobook-generator-w1tf.onrender.com"
    ]
    
    # Cookie Settings
    cookie_secure: bool = None  # Will be set based on environment
    cookie_samesite: str = None  # Will be set based on environment
    cookie_domain: Optional[str] = None  # Will be determined based on environment
    
    # Database Settings
    database_url: str
    async_database_url: str | None = None
    
    # Authentication Settings
    jwt_secret: str
    reset_password_secret: str
    verification_secret: str
    
    # ElevenLabs Settings
    elevenlabs_api_key: str
    default_voice: str = "Adam"
    max_text_length: int = 500  # Maximum number of characters for sample
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    def get_cookie_domain(self) -> Optional[str]:
        """Get cookie domain based on environment"""
        if self.ENV == "production":
            # Extract domain from backend URL
            from urllib.parse import urlparse
            parsed = urlparse(self.BACKEND_URL)
            return parsed.netloc
        return None  # No domain restriction in development

@lru_cache()
def get_settings() -> Settings:
    """Get cached settings"""
    settings = Settings()
    
    # Set URLs based on environment
    if settings.ENV == "production":
        settings.FRONTEND_URL = "https://audiobook-generator-two.vercel.app"
        settings.BACKEND_URL = "https://audiobook-generator-w1tf.onrender.com"
        settings.cookie_secure = True
        settings.cookie_samesite = "none"
    else:
        settings.cookie_secure = False
        settings.cookie_samesite = "lax"
    
    return settings

def get_allowed_origins() -> List[str]:
    """Get allowed origins for CORS"""
    return get_settings().allowed_origins 