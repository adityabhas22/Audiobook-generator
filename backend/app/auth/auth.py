from fastapi_users.authentication import CookieTransport, JWTStrategy, AuthenticationBackend
from fastapi_users import FastAPIUsers
from app.auth.manager import get_user_manager
from app.auth.models import User
from app.config import get_settings
from typing import Optional
from fastapi import Request, Response
import logging
from urllib.parse import urlparse

# Configure more detailed logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

settings = get_settings()

# Log environment and settings
logger.info(f"Current environment: {settings.ENV}")
logger.info(f"Backend URL: {settings.BACKEND_URL}")
logger.info(f"Frontend URL: {settings.FRONTEND_URL}")
logger.info(f"Cookie secure: {settings.cookie_secure}")
logger.info(f"Cookie samesite: {settings.cookie_samesite}")

# Get domain for production
backend_domain = "audiobook-generator-w1tf.onrender.com"
logger.info(f"Using cookie domain: {backend_domain}")

# Custom cookie transport with debug logging
class DebugCookieTransport(CookieTransport):
    async def get_login_response(self, token: str) -> Response:
        logger.debug(f"Setting login cookie with token length: {len(token)}")
        response = await super().get_login_response(token)
        logger.debug(f"Login response headers: {dict(response.headers)}")
        return response

    async def get_logout_response(self) -> Response:
        logger.debug("Getting logout response")
        return await super().get_logout_response()

    async def get_strategy_from_request(self, request: Request) -> Optional[str]:
        logger.debug(f"Getting strategy from request. Cookies present: {request.cookies.keys()}")
        token = await super().get_strategy_from_request(request)
        logger.debug(f"Token found in request: {'Yes' if token else 'No'}")
        return token

# Cookie transport for authentication
cookie_transport = DebugCookieTransport(
    cookie_name="audiobook_auth",
    cookie_max_age=3600,
    cookie_secure=settings.cookie_secure,
    cookie_httponly=True,
    cookie_samesite=settings.cookie_samesite,
    cookie_path="/",
    cookie_domain=backend_domain
)

# Log cookie transport configuration
logger.info("Cookie transport configuration:")
logger.info(f"- Name: audiobook_auth")
logger.info(f"- Secure: {settings.cookie_secure}")
logger.info(f"- SameSite: {settings.cookie_samesite}")
logger.info(f"- Domain: {backend_domain}")

# JWT Strategy with debug logging
class DebugJWTStrategy(JWTStrategy):
    async def read_token(self, token: Optional[str]) -> Optional[str]:
        logger.debug(f"Reading JWT token: {'Present' if token else 'None'}")
        result = await super().read_token(token)
        logger.debug(f"JWT token validation result: {'Valid' if result else 'Invalid'}")
        return result

def get_jwt_strategy() -> JWTStrategy:
    logger.debug("Creating new JWT strategy")
    return DebugJWTStrategy(secret=settings.jwt_secret, lifetime_seconds=3600)

# Authentication backend with debug logging
class DebugAuthBackend(AuthenticationBackend):
    async def authenticate(self, request: Request) -> Optional[str]:
        logger.debug(f"Authenticating request to: {request.url.path}")
        strategy = await self.get_strategy_from_request(request)
        logger.debug(f"Authentication strategy result: {'Success' if strategy else 'Failed'}")
        return strategy

# Authentication backend
auth_backend = DebugAuthBackend(
    name="jwt",
    transport=cookie_transport,
    get_strategy=get_jwt_strategy,
)

# FastAPI Users instance
fastapi_users = FastAPIUsers[User, int](
    get_user_manager,
    [auth_backend],
)

# Auth dependencies with debug logging
async def debug_current_active_user(request: Request):
    logger.debug(f"Checking current active user for path: {request.url.path}")
    logger.debug(f"Request headers: {dict(request.headers)}")
    logger.debug(f"Request cookies: {request.cookies}")
    return await fastapi_users.current_user(active=True)(request)

# Auth dependencies
current_active_user = debug_current_active_user
current_superuser = fastapi_users.current_user(active=True, superuser=True) 