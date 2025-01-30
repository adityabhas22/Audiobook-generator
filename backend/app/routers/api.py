from fastapi import APIRouter, UploadFile, HTTPException
from fastapi.responses import StreamingResponse
from app.services import text_processor, tts_service
from app.models import GenerateAudioRequest, VoicesResponse, ErrorResponse
import io

router = APIRouter()

@router.post(
    "/upload",
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    }
)
async def upload_file(file: UploadFile):
    """
    Upload a text or epub file and extract its content
    
    Args:
        file: The file to upload (.txt or .epub)
        
    Returns:
        dict: The extracted text content
        
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
        return {"content": content}
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