from typing import Optional
from datetime import datetime
from fastapi import Depends, Request, Response
from fastapi_users import BaseUserManager, IntegerIDMixin, exceptions, models, schemas
from fastapi_users.db import SQLAlchemyUserDatabase
from sqlalchemy.ext.asyncio import AsyncSession
import os
from dotenv import load_dotenv

from app.auth.models import User
from app.database import get_async_session

load_dotenv()

# Get secrets from environment
RESET_PASSWORD_SECRET = os.getenv("RESET_PASSWORD_SECRET")
VERIFICATION_SECRET = os.getenv("VERIFICATION_SECRET")

if not RESET_PASSWORD_SECRET or not VERIFICATION_SECRET:
    raise ValueError("RESET_PASSWORD_SECRET and VERIFICATION_SECRET must be set")

class UserManager(IntegerIDMixin, BaseUserManager[User, int]):
    reset_password_token_secret = RESET_PASSWORD_SECRET
    verification_token_secret = VERIFICATION_SECRET

    async def on_after_register(self, user: User, request: Optional[Request] = None):
        """Perform actions after user registration"""
        print(f"User {user.id} has registered.")

    async def on_after_login(
        self,
        user: User,
        request: Optional[Request] = None,
        response: Optional[Response] = None,
    ):
        """Update last login timestamp"""
        await self.user_db.update(
            user,
            {"last_login": datetime.utcnow()}
        )

    async def on_after_forgot_password(
        self, user: User, token: str, request: Optional[Request] = None
    ):
        """Handle forgot password event"""
        print(f"User {user.id} has forgot their password. Reset token: {token}")

    async def on_after_verify(
        self, user: User, request: Optional[Request] = None
    ):
        """Handle user verification"""
        print(f"User {user.id} has been verified")

async def get_user_db(session: AsyncSession = Depends(get_async_session)):
    """Get user database dependency"""
    yield SQLAlchemyUserDatabase(session, User)

async def get_user_manager(user_db: SQLAlchemyUserDatabase = Depends(get_user_db)):
    """Get user manager dependency"""
    yield UserManager(user_db) 