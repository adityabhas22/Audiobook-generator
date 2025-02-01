from typing import Optional, List, TYPE_CHECKING, ForwardRef
from datetime import datetime
from fastapi_users.db import SQLAlchemyBaseUserTable
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, DateTime
from app.database import Base

if TYPE_CHECKING:
    from app.models import Book

class User(SQLAlchemyBaseUserTable[int], Base):
    """User model for authentication"""
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(length=320), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(length=1024), nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(default=False, nullable=False)
    is_verified: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Additional fields
    name: Mapped[Optional[str]] = mapped_column(String(length=255), nullable=True)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    if TYPE_CHECKING:
        books: Mapped[List["Book"]]
    else:
        books: Mapped[List[ForwardRef("Book")]] = relationship(
            "Book", 
            back_populates="user", 
            cascade="all, delete-orphan"
        ) 