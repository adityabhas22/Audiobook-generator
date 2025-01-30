from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.routers import api
from app.config import get_settings
from app.models import ErrorResponse

settings = get_settings()

app = FastAPI(
    title=settings.api_title,
    description=settings.api_description,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    }
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(api.router, prefix="/api")

@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)}
    ) 