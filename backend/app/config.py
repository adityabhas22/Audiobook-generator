from pydantic_settings import BaseSettings
from functools import lru_cache
import json

class Settings(BaseSettings):
    """Application settings"""
    # API Settings
    api_title: str = "Audiobook Generator API"
    api_description: str = "API for generating audiobook samples using ElevenLabs TTS"
    
    # CORS Settings
    allowed_origins: str = '["http://localhost:3000","http://localhost:3001","http://localhost:8000","https://audiobook-generator-two.vercel.app","https://audiobook-generator.vercel.app"]'
    
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

    def get_cors_origins(self) -> list[str]:
        """Get CORS origins as a list"""
        return json.loads(self.allowed_origins)

@lru_cache()
def get_settings() -> Settings:
    """Get cached settings"""
    return Settings()

def get_allowed_origins():
    """Get allowed origins for CORS"""
    settings = get_settings()
    return settings.get_cors_origins() 