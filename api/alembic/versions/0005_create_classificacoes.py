"""create classificacoes

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "classificacoes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "item_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("itens.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("flag", sa.Enum("verde", "amarelo", "vermelho", name="flag_classificacao"), nullable=False),
        sa.Column("origem", sa.Enum("auto", "manual", name="origem_classificacao"), nullable=False),
        sa.Column("justificativa", sa.Text(), nullable=True),
        sa.Column("fontes", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column(
            "procedimento_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("procedimentos.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("classificacoes")
    op.execute("DROP TYPE IF EXISTS flag_classificacao")
    op.execute("DROP TYPE IF EXISTS origem_classificacao")
