"""create sessoes, notas, anexos, status_historico

Revision ID: 0006
Revises: 0005
Create Date: 2026-10-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    status_item_enum = postgresql.ENUM(
        "pendente",
        "em_andamento",
        "concluido",
        "bloqueado",
        "nao_aplicavel",
        name="status_item",
        create_type=False,
    )

    op.create_table(
        "sessoes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("poc_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pocs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("data", sa.Date(), nullable=False),
        sa.Column("participantes", postgresql.ARRAY(sa.String()), nullable=False, server_default="{}"),
        sa.Column("agenda", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "notas",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("itens.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sessao_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sessoes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("texto", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "anexos",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("itens.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sessao_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sessoes.id", ondelete="SET NULL"), nullable=True),
        sa.Column("nome_arquivo", sa.String(255), nullable=False),
        sa.Column("caminho_arquivo", sa.String(500), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "status_historico",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("itens.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sessao_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sessoes.id", ondelete="SET NULL"), nullable=True),
        sa.Column("status_anterior", status_item_enum, nullable=True),
        sa.Column("status_novo", status_item_enum, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("status_historico")
    op.drop_table("anexos")
    op.drop_table("notas")
    op.drop_table("sessoes")
