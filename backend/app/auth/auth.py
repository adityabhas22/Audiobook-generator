from fastapi_users.authentication import CookieTransport, JWTStrategy, AuthenticationBackend
from fastapi_users import FastAPIUsers
from app.auth.manager import get_user_manager
from app.auth.models import User
from app.config import get_settings
from typing import Optional
from fastapi import Request, Response
import logging
from urllib.parse import urlparse
import json
from fastapi import Depends

settings = get_settings()
logger = logging.getLogger(__name__)
# Set logging level to DEBUG for more detailed logs
logger.setLevel(logging.DEBUG)

# Log environment and settings
logger.info("=== Authentication Configuration ===")
logger.info(f"Current environment: {settings.ENV}")
logger.info(f"Backend URL: {settings.BACKEND_URL}")
logger.info(f"Frontend URL: {settings.FRONTEND_URL}")
logger.info(f"Cookie secure: {settings.cookie_secure}")
logger.info(f"Cookie samesite: {settings.cookie_samesite}")

# Get domain for production
backend_domain = urlparse(settings.BACKEND_URL).netloc if settings.ENV == "production" else None
logger.info(f"Using cookie domain: {backend_domain}")

async def debug_request(request: Request):
    """Debug helper to log request details"""
    logger.debug("=== Incoming Request Debug ===")
    logger.debug(f"Method: {request.method}")
    logger.debug(f"URL: {request.url}")
    logger.debug("Headers:")
    for k, v in request.headers.items():
        logger.debug(f"  {k}: {v}")
    logger.debug("Cookies:")
    for k, v in request.cookies.items():
        logger.debug(f"  {k}: {v}")

# Custom cookie transport with debugging
class DebugCookieTransport(CookieTransport):
    async def get_login_response(self, token: str):
        response = await super().get_login_response(token)
        logger.debug("=== Login Response Debug ===")
        logger.debug(f"Token length: {len(token)}")
        logger.debug("Response headers:")
        for k, v in response.headers.items():
            logger.debug(f"  {k}: {v}")
        return response

# Cookie transport for authentication
cookie_transport = DebugCookieTransport(
    cookie_name="audiobook_auth",
    cookie_max_age=3600,
    cookie_secure=settings.cookie_secure,
    cookie_httponly=True,
    cookie_samesite=settings.cookie_samesite,
    cookie_path="/",
    cookie_domain="audiobook-generator-w1tf.onrender.com"  # Explicitly hardcode for now
)

# Log cookie transport configuration
logger.info("=== Cookie Configuration ===")
logger.info(f"- Name: audiobook_auth")
logger.info(f"- Secure: {settings.cookie_secure}")
logger.info(f"- SameSite: {settings.cookie_samesite}")
logger.info(f"- Domain: audiobook-generator-w1tf.onrender.com")
logger.info(f"- HttpOnly: True")
logger.info(f"- Path: /")
logger.info(f"- Max Age: 3600")

# JWT Strategy with debugging
class DebugJWTStrategy(JWTStrategy):
    async def read_token(self, token: Optional[str], *args, **kwargs):
        logger.debug("=== JWT Debug ===")
        logger.debug(f"Reading token: {token[:10]}..." if token else "No token")
        result = await super().read_token(token, *args, **kwargs)
        logger.debug(f"Token valid: {result is not None}")
        return result

def get_jwt_strategy() -> JWTStrategy:
    return DebugJWTStrategy(secret=settings.jwt_secret, lifetime_seconds=3600)

# Authentication backend with debugging
class DebugAuthenticationBackend(AuthenticationBackend):
    async def authenticate(self, strategy, get_strategy, request: Request):
        await debug_request(request)
        try:
            result = await super().authenticate(strategy, get_strategy, request)
            logger.debug(f"Authentication result: {'Success' if result else 'Failed'}")
            return result
        except Exception as e:
            logger.exception("Authentication error:")
            raise

auth_backend = DebugAuthenticationBackend(
    name="jwt",
    transport=cookie_transport,
    get_strategy=get_jwt_strategy,
)

# FastAPI Users instance
fastapi_users = FastAPIUsers[User, int](
    get_user_manager,
    [auth_backend],
)

# Current user dependencies with debugging
current_active_user = fastapi_users.current_user(active=True)
current_superuser = fastapi_users.current_user(active=True, superuser=True)

# Add debug wrapper for routes that use current_user
async def get_debug_user(user = Depends(current_active_user)):
    logger.debug("=== Current User Debug ===")
    logger.debug(f"User ID: {user.id}")
    logger.debug(f"User Email: {user.email}")
    logger.debug(f"User Is Active: {user.is_active}")
    logger.debug(f"User Is Verified: {user.is_verified}")
    logger.debug(f"User Is Superuser: {user.is_superuser}")
    return user 