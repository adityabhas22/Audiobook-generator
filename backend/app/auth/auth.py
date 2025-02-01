from fastapi_users.authentication import CookieTransport, JWTStrategy, AuthenticationBackend
from fastapi_users import FastAPIUsers
from app.auth.manager import get_user_manager
from app.auth.models import User
from app.config import get_settings
from typing import Optional
from fastapi import Request, Response
import logging

settings = get_settings()
logger = logging.getLogger(__name__)

class DebugCookieTransport(CookieTransport):
    async def get_login_response(self, token: str) -> Response:
        response = await super().get_login_response(token)
        logger.info(f"Cookie settings: secure={self.cookie_secure}, httponly={self.cookie_httponly}, samesite={self.cookie_samesite}")
        return response

    async def get_strategy_from_request(self, request: Request) -> Optional[str]:
        try:
            token = request.cookies.get(self.cookie_name)
            if not token:
                logger.warning("No authentication cookie found in request")
            return token
        except Exception as e:
            logger.error(f"Error reading authentication cookie: {str(e)}")
            return None

# Cookie transport for authentication
cookie_transport = DebugCookieTransport(
    cookie_name="audiobook_auth",
    cookie_max_age=3600,
    cookie_secure=True,  # Required for production HTTPS
    cookie_httponly=True,
    cookie_samesite="lax",
    # No cookie_domain set - let it use the default domain behavior
)

# JWT Strategy with better error handling
def get_jwt_strategy() -> JWTStrategy:
    try:
        return JWTStrategy(secret=settings.jwt_secret, lifetime_seconds=3600)
    except Exception as e:
        logger.error(f"Failed to initialize JWT strategy: {str(e)}")
        raise

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