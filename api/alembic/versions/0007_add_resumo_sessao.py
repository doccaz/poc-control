"""add resumo_bruto, pontos_resolvidos, pontos_falha, proximos_passos to sessoes

Revision ID: 0007
Revises: 0006
Create Date: 2026-10-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("sessoes", sa.Column("resumo_bruto", sa.Text(), nullable=True))
    op.add_column(
        "sessoes",
        sa.Column("pontos_resolvidos", postgresql.ARRAY(sa.String()), nullable=False, server_default="{}"),
    )
    op.add_column(
        "sessoes", sa.Column("pontos_falha", postgresql.ARRAY(sa.String()), nullable=False, server_default="{}")
    )
    op.add_column(
        "sessoes", sa.Column("proximos_passos", postgresql.ARRAY(sa.String()), nullable=False, server_default="{}")
    )


def downgrade() -> None:
    op.drop_column("sessoes", "proximos_passos")
    op.drop_column("sessoes", "pontos_falha")
    op.drop_column("sessoes", "pontos_resolvidos")
    op.drop_column("sessoes", "resumo_bruto")
