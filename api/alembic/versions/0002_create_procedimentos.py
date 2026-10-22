"""create procedimentos and procedimento_chunks

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-22

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from pgvector.sqlalchemy import Vector

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

EMBEDDING_DIM = 1536


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "procedimentos",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("titulo", sa.String(255), nullable=False),
        sa.Column("tags", postgresql.ARRAY(sa.String()), nullable=False, server_default="{}"),
        sa.Column("cliente_origem", sa.String(255), nullable=True),
        sa.Column("data_origem", sa.Date(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("rascunho", "validado", name="status_procedimento"),
            nullable=False,
            server_default="rascunho",
        ),
        sa.Column("versao", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("html_original", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "procedimento_chunks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "procedimento_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("procedimentos.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("heading_level", sa.Integer(), nullable=False),
        sa.Column("heading_title", sa.String(255), nullable=False),
        sa.Column("parent_heading_title", sa.String(255), nullable=True),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("content_text", sa.Text(), nullable=False),
        sa.Column("embedding", Vector(EMBEDDING_DIM), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("procedimento_chunks")
    op.drop_table("procedimentos")
    op.execute("DROP TYPE IF EXISTS status_procedimento")
    op.execute("DROP EXTENSION IF EXISTS vector")
