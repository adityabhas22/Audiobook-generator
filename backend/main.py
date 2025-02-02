from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import api, auth
from app.config import get_settings, get_allowed_origins
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()

app = FastAPI(
    title=settings.api_title,
    description=settings.api_description
)

# Log CORS settings
logger.info(f"Allowed origins: {get_allowed_origins()}")

# Configure CORS - must be first middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["Set-Cookie", "Authorization"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

@app.get("/")
async def root():
    return {"status": "ok", "message": "API is running"}

# Include routers
app.include_router(auth.router, prefix="/api")  # Include auth routes first
app.include_router(api.router, prefix="/api") 