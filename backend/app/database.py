from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Get the database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

# Convert the URL to async format for PostgreSQL
ASYNC_DATABASE_URL = DATABASE_URL.replace('postgresql://', 'postgresql+asyncpg://')
ASYNC_DATABASE_URL = ASYNC_DATABASE_URL.replace('?sslmode=require', '')

# Create async engine with SSL configuration
engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=True,
    connect_args={"ssl": True}
)

async_session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Base class for SQLAlchemy models
class Base(DeclarativeBase):
    pass

# Dependency to get async database session
async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session 