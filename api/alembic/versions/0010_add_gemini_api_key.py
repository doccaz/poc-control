"""add gemini_api_key_encrypted to users

Revision ID: 0010
Revises: 0009
Create Date: 2026-10-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0010"
down_revision: Union[str, None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("gemini_api_key_encrypted", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "gemini_api_key_encrypted")
