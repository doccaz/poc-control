"""add modelo (gemini model actually used) to classificacoes and pocs

Revision ID: 0012
Revises: 0011
Create Date: 2026-10-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0012"
down_revision: Union[str, None] = "0011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("classificacoes", sa.Column("modelo", sa.String(length=100), nullable=True))
    op.add_column("pocs", sa.Column("modelo_extracao", sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column("pocs", "modelo_extracao")
    op.drop_column("classificacoes", "modelo")
