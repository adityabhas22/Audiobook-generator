from pydantic import BaseModel, Field
from typing import Optional, List

class Voice(BaseModel):
    """Voice model"""
    voice_id: str
    name: str
    description: Optional[str] = None

class VoicesResponse(BaseModel):
    """Response model for voices endpoint"""
    voices: List[Voice]

class GenerateAudioRequest(BaseModel):
    """Request model for generate-sample endpoint"""
    text: str = Field(..., min_length=1, max_length=5000)
    voice_id: Optional[str] = None
    start_position: Optional[int] = Field(default=0, ge=0)
    end_position: Optional[int] = None

    def clean_text_selection(self) -> str:
        """Get the selected portion of text"""
        if self.end_position is not None:
            return self.text[self.start_position:self.end_position]
        return self.text[self.start_position:]

class ErrorResponse(BaseModel):
    """Error response model"""
    detail: str 