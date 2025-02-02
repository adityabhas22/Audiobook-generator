from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import api, auth
from app.config import get_settings, get_allowed_origins
import logging
import os

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
    allow_origins=["https://audiobook-generator-two.vercel.app"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Content-Type", 
        "Authorization", 
        "Accept", 
        "Origin", 
        "X-Requested-With",
        "Cookie",
    ],
    expose_headers=["Set-Cookie"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

@app.get("/")
async def root():
    return {"status": "ok", "message": "API is running"}

# Include routers
app.include_router(auth.router, prefix="/api")  # Include auth routes first
app.include_router(api.router, prefix="/api")

# Add port configuration for Render
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True) 