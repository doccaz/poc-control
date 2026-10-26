"""add gemini_model to users and parametros_tecnicos to pocs

Revision ID: 0011
Revises: 0010
Create Date: 2026-10-26

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0011"
down_revision: Union[str, None] = "0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("gemini_model", sa.String(length=100), nullable=True))
    op.add_column("pocs", sa.Column("parametros_tecnicos", postgresql.JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column("pocs", "parametros_tecnicos")
    op.drop_column("users", "gemini_model")
