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

# Cookie transport for authentication
cookie_transport = CookieTransport(
    cookie_name="audiobook_auth",
    cookie_max_age=3600,
    cookie_secure=True,  # Required for cross-origin
    cookie_httponly=True,
    cookie_samesite="none",  # Required for cross-origin
    cookie_path="/"  # Root path to ensure cookie is sent for all requests
)

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