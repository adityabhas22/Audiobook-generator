from fastapi_users.authentication import CookieTransport, JWTStrategy, AuthenticationBackend
from fastapi_users import FastAPIUsers
from app.auth.manager import get_user_manager
from app.auth.models import User
from app.config import get_settings
from typing import Optional
from fastapi import Request, Response
import logging
from urllib.parse import urlparse

settings = get_settings()
logger = logging.getLogger(__name__)

# Log environment and settings
logger.info(f"Current environment: {settings.ENV}")
logger.info(f"Backend URL: {settings.BACKEND_URL}")
logger.info(f"Frontend URL: {settings.FRONTEND_URL}")
logger.info(f"Cookie secure: {settings.cookie_secure}")
logger.info(f"Cookie samesite: {settings.cookie_samesite}")

# Get domain for production
backend_domain = urlparse(settings.BACKEND_URL).netloc if settings.ENV == "production" else None
logger.info(f"Using cookie domain: {backend_domain}")

# Cookie transport for authentication
cookie_transport = CookieTransport(
    cookie_name="audiobook_auth",
    cookie_max_age=3600,
    cookie_secure=settings.cookie_secure,
    cookie_httponly=True,
    cookie_samesite=settings.cookie_samesite,
    cookie_path="/",
    cookie_domain="audiobook-generator-w1tf.onrender.com"  # Explicitly hardcode for now
)

# Log cookie transport configuration
logger.info(f"Cookie transport configuration:")
logger.info(f"- Name: audiobook_auth")
logger.info(f"- Secure: {settings.cookie_secure}")
logger.info(f"- SameSite: {settings.cookie_samesite}")
logger.info(f"- Domain: audiobook-generator-w1tf.onrender.com")

# JWT Strategy
def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(secret=settings.jwt_secret, lifetime_seconds=3600)

# Authentication backend
auth_backend = AuthenticationBackend(
    name="jwt",
    transport=cookie_transport,
    get_strategy=get_jwt_strategy,
)

# FastAPI Users instance
fastapi_users = FastAPIUsers[User, int](
    get_user_manager,
    [auth_backend],
)

# Auth dependencies
current_active_user = fastapi_users.current_user(active=True)
current_superuser = fastapi_users.current_user(active=True, superuser=True) 