from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import api, auth
from app.config import get_settings, get_allowed_origins
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)

settings = get_settings()

app = FastAPI(
    title=settings.api_title,
    description=settings.api_description
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Set-Cookie"]
)

@app.get("/")
async def root():
    return {"status": "ok", "message": "API is running"}

# Include routers
app.include_router(auth.router, prefix="/api")  # Include auth routes first
app.include_router(api.router, prefix="/api") 