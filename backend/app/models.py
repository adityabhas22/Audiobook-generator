from pydantic import BaseModel, Field
from typing import Optional, List, TYPE_CHECKING, ForwardRef
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, JSON, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base

if TYPE_CHECKING:
    from .auth.models import User

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
    text: str = Field(..., min_length=1, max_length=500000)
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

class Book(Base):
    __tablename__ = "books"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    content: Mapped[str] = mapped_column(Text)
    upload_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_voice_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    voice_settings: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Relationship to user
    if TYPE_CHECKING:
        user: Mapped["User"]
    else:
        user: Mapped[ForwardRef("User")] = relationship("User", back_populates="books")

    def __repr__(self) -> str:
        return f"Book(id={self.id}, title={self.title}, user_id={self.user_id})" 