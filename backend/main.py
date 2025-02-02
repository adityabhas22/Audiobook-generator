from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import api, auth
from app.config import get_settings, get_allowed_origins
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

# Configure logging
logging.basicConfig(level=logging.INFO)

settings = get_settings()

class CookieMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        if 'set-cookie' in response.headers:
            # Get all cookies
            cookies = response.headers.getlist('set-cookie')
            # Clear existing cookies
            response.headers.pop('set-cookie')
            # Add modified cookies
            for cookie in cookies:
                if 'SameSite' not in cookie:
                    cookie += '; SameSite=None; Secure'
                response.headers.append('set-cookie', cookie)
        return response

app = FastAPI(
    title=settings.api_title,
    description=settings.api_description
)

# Configure CORS - must be first middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["Set-Cookie"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Add cookie middleware after CORS
app.add_middleware(CookieMiddleware)

@app.get("/")
async def root():
    return {"status": "ok", "message": "API is running"}

# Include routers
app.include_router(auth.router, prefix="/api")  # Include auth routes first
app.include_router(api.router, prefix="/api") 