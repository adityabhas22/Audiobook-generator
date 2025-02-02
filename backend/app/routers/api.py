from fastapi import APIRouter, UploadFile, HTTPException, Depends
from fastapi.responses import StreamingResponse
from app.services import text_processor, tts_service
from app.models import GenerateAudioRequest, VoicesResponse, ErrorResponse, Book
from app.auth.models import User
from app.auth.auth import current_active_user
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_async_session
from sqlalchemy import select
import io
from pydantic import BaseModel, Field

router = APIRouter()

# Constants
MAX_PUBLIC_CHARS = 500  # Maximum characters for public endpoints

# Public endpoint models
class PublicTextRequest(BaseModel):
    """Request model for public text-to-speech endpoint"""
    text: str = Field(..., max_length=MAX_PUBLIC_CHARS)
    voice_id: str | None = None

class PublicBookRequest(BaseModel):
    """Request model for public book processing"""
    title: str = Field(..., max_length=100)
    content: str = Field(..., max_length=MAX_PUBLIC_CHARS)
    voice_id: str | None = None

# Public endpoints (no authentication required)
@router.get(
    "/voices",
    response_model=VoicesResponse,
    responses={
        500: {"model": ErrorResponse}
    }
)
async def get_voices():
    """
    Get available voices from ElevenLabs
    
    Returns:
        VoicesResponse: List of available voices
        
    Raises:
        HTTPException: If fetching voices fails
    """
    try:
        voices = await tts_service.get_available_voices()
        return VoicesResponse(voices=voices)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/public/generate-audio")
async def generate_public_audio(request: PublicTextRequest):
    """
    Generate audio from text without requiring authentication
    
    Args:
        request: The text to convert and optional voice ID
        
    Returns:
        StreamingResponse: The generated audio file
    """
    try:
        audio_data = await tts_service.generate_audio(request.text, request.voice_id)
        return StreamingResponse(
            io.BytesIO(audio_data),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "attachment; filename=generated-audio.mp3"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/public/process-book")
async def process_public_book(request: PublicBookRequest):
    """
    Process a book without authentication
    
    Args:
        request: Book details including title, content and optional voice ID
        
    Returns:
        dict: Processed book content and audio URL
    """
    try:
        # Generate audio for the content
        audio_data = await tts_service.generate_audio(request.content, request.voice_id)
        
        # Return the processed content
        return {
            "title": request.title,
            "content": request.content,
            "audio": StreamingResponse(
                io.BytesIO(audio_data),
                media_type="audio/mpeg",
                headers={
                    "Content-Disposition": f"attachment; filename={request.title.lower().replace(' ', '_')}.mp3"
                }
            )
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/public/upload")
async def upload_public_file(file: UploadFile):
    """
    Upload and process a file without authentication
    
    Args:
        file: The file to upload (.txt or .epub)
        
    Returns:
        dict: The extracted content
    """
    if not file.filename.endswith(('.txt', '.epub')):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload a .txt or .epub file"
        )
    
    try:
        content = await text_processor.extract_text(file)
        
        # Limit content length for public endpoint
        if len(content) > MAX_PUBLIC_CHARS:
            content = content[:MAX_PUBLIC_CHARS]
            
        return {
            "title": file.filename,
            "content": content
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Book-related endpoints
@router.get("/books")
async def get_user_books(
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get all books for the current user"""
    query = select(Book).where(Book.user_id == user.id)
    result = await session.execute(query)
    books = result.scalars().all()
    return books

@router.post("/books")
async def create_book(
    title: str,
    content: str,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Create a new book for the current user"""
    book = Book(
        title=title,
        content=content,
        user_id=user.id
    )
    session.add(book)
    await session.commit()
    await session.refresh(book)
    return book

@router.get("/books/{book_id}")
async def get_book(
    book_id: int,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get a specific book for the current user"""
    query = select(Book).where(Book.id == book_id, Book.user_id == user.id)
    result = await session.execute(query)
    book = result.scalar_one_or_none()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book

@router.put("/books/{book_id}")
async def update_book(
    book_id: int,
    title: str = None,
    content: str = None,
    last_voice_id: str = None,
    voice_settings: dict = None,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Update a book for the current user"""
    query = select(Book).where(Book.id == book_id, Book.user_id == user.id)
    result = await session.execute(query)
    book = result.scalar_one_or_none()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    if title is not None:
        book.title = title
    if content is not None:
        book.content = content
    if last_voice_id is not None:
        book.last_voice_id = last_voice_id
    if voice_settings is not None:
        book.voice_settings = voice_settings
    
    await session.commit()
    await session.refresh(book)
    return book

@router.delete("/books/{book_id}")
async def delete_book(
    book_id: int,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Delete a book for the current user"""
    query = select(Book).where(Book.id == book_id, Book.user_id == user.id)
    result = await session.execute(query)
    book = result.scalar_one_or_none()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    await session.delete(book)
    await session.commit()
    return {"detail": "Book deleted successfully"}

@router.post(
    "/upload",
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    }
)
async def upload_file(
    file: UploadFile,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """
    Upload a text or epub file and extract its content
    
    Args:
        file: The file to upload (.txt or .epub)
        
    Returns:
        dict: The created book with extracted content
        
    Raises:
        HTTPException: If file format is unsupported or processing fails
    """
    if not file.filename.endswith(('.txt', '.epub')):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload a .txt or .epub file"
        )
    
    try:
        content = await text_processor.extract_text(file)
        # Create a new book for the user
        book = Book(
            title=file.filename,
            content=content,
            user_id=user.id
        )
        session.add(book)
        await session.commit()
        await session.refresh(book)
        return book
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post(
    "/generate-sample",
    response_class=StreamingResponse,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    }
)
async def generate_sample(request: GenerateAudioRequest):
    """
    Generate an audio sample using ElevenLabs TTS
    
    Args:
        request: The generation request containing:
            - text: Full text content
            - voice_id: Optional voice ID to use
            - start_position: Optional start position for text selection
            - end_position: Optional end position for text selection
        
    Returns:
        StreamingResponse: The generated audio file
        
    Raises:
        HTTPException: If generation fails or selection is invalid
    """
    try:
        # Validate text selection
        if request.end_position is not None and request.end_position <= request.start_position:
            raise HTTPException(
                status_code=400,
                detail="end_position must be greater than start_position"
            )
        
        if request.start_position >= len(request.text):
            raise HTTPException(
                status_code=400,
                detail="start_position is beyond text length"
            )
        
        # Get selected text
        selected_text = request.clean_text_selection()
        if not selected_text:
            raise HTTPException(
                status_code=400,
                detail="Selected text is empty"
            )
        
        # Generate audio from selected text
        audio_data = await tts_service.generate_audio(selected_text, request.voice_id)
        return StreamingResponse(
            io.BytesIO(audio_data),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "attachment; filename=sample.mp3"
            }
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get(
    "/voice-preview/{voice_id}",
    response_class=StreamingResponse,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    }
)
async def get_voice_preview(voice_id: str):
    """
    Get a quick preview of a voice using a standard sample text
    
    Args:
        voice_id: The ID of the voice to preview
        
    Returns:
        StreamingResponse: Short audio sample of the voice
        
    Raises:
        HTTPException: If preview generation fails
    """
    preview_text = "Hello! This is a sample of my voice. I hope you like how it sounds."
    try:
        audio_data = await tts_service.generate_audio(preview_text, voice_id)
        return StreamingResponse(
            io.BytesIO(audio_data),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "attachment; filename=voice-preview.mp3"
            }
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 