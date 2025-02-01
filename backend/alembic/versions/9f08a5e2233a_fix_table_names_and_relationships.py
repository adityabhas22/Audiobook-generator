"""Fix table names and relationships

Revision ID: 9f08a5e2233a
Revises: 715c0e644860
Create Date: 2025-01-31 23:31:16.596598

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '9f08a5e2233a'
down_revision: Union[str, None] = '715c0e644860'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create new users table
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=320), nullable=False),
        sa.Column('hashed_password', sa.String(length=1024), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_superuser', sa.Boolean(), nullable=False),
        sa.Column('is_verified', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=True),
        sa.Column('last_login', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    
    # Copy data from old user table to new users table
    op.execute('INSERT INTO users SELECT * FROM "user"')
    
    # Update foreign key
    op.drop_constraint('books_user_id_fkey', 'books', type_='foreignkey')
    op.create_foreign_key(None, 'books', 'users', ['user_id'], ['id'])
    
    # Drop old user table and its index
    op.drop_index('ix_user_email', table_name='user')
    op.drop_table('user')


def downgrade() -> None:
    # Create old user table
    op.create_table('user',
        sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
        sa.Column('email', sa.VARCHAR(length=320), autoincrement=False, nullable=False),
        sa.Column('hashed_password', sa.VARCHAR(length=1024), autoincrement=False, nullable=False),
        sa.Column('is_active', sa.BOOLEAN(), autoincrement=False, nullable=False),
        sa.Column('is_superuser', sa.BOOLEAN(), autoincrement=False, nullable=False),
        sa.Column('is_verified', sa.BOOLEAN(), autoincrement=False, nullable=False),
        sa.Column('created_at', postgresql.TIMESTAMP(), autoincrement=False, nullable=False),
        sa.Column('name', sa.VARCHAR(length=255), autoincrement=False, nullable=True),
        sa.Column('last_login', postgresql.TIMESTAMP(), autoincrement=False, nullable=True),
        sa.PrimaryKeyConstraint('id', name='user_pkey')
    )
    
    # Copy data back
    op.execute('INSERT INTO "user" SELECT * FROM users')
    
    # Create old index and constraints
    op.create_index('ix_user_email', 'user', ['email'], unique=True)
    op.drop_constraint(None, 'books', type_='foreignkey')
    op.create_foreign_key('books_user_id_fkey', 'books', 'user', ['user_id'], ['id'])
    
    # Drop new users table
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
