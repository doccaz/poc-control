"""add resumo_executivo to pocs

Revision ID: 0009
Revises: 0008
Create Date: 2026-10-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("pocs", sa.Column("resumo_executivo", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("pocs", "resumo_executivo")
