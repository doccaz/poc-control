"""create pocs, poc_documentos, itens, poc_prerequisitos

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-22

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "pocs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("titulo", sa.String(255), nullable=False),
        sa.Column("cliente", sa.String(255), nullable=False),
        sa.Column("escopo", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("ativa", "concluida", "suspensa", name="status_poc"),
            nullable=False,
            server_default="ativa",
        ),
        sa.Column(
            "status_extracao",
            sa.Enum("extraindo", "pronto", "erro", name="status_extracao"),
            nullable=False,
            server_default="extraindo",
        ),
        sa.Column("erro_extracao", sa.Text(), nullable=True),
        sa.Column("fases", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "poc_documentos",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("poc_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pocs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("nome_arquivo", sa.String(255), nullable=False),
        sa.Column("caminho_arquivo", sa.String(500), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "itens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("poc_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pocs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("codigo", sa.String(50), nullable=False),
        sa.Column("titulo", sa.String(500), nullable=False),
        sa.Column("descricao", sa.Text(), nullable=True),
        sa.Column("criterio_aceite", sa.Text(), nullable=True),
        sa.Column("categoria", sa.String(255), nullable=True),
        sa.Column("fase", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("ref", sa.String(255), nullable=True),
        sa.Column("conducao", sa.Enum("suse", "cliente", "lateral", name="condicao_item"), nullable=True),
        sa.Column(
            "status",
            sa.Enum("pendente", "em_andamento", "concluido", "bloqueado", "nao_aplicavel", name="status_item"),
            nullable=False,
            server_default="pendente",
        ),
        sa.Column("ordem", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "poc_prerequisitos",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("poc_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pocs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("titulo", sa.String(255), nullable=False),
        sa.Column("descricao", sa.Text(), nullable=True),
        sa.Column("atendido", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("ordem", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("poc_prerequisitos")
    op.drop_table("itens")
    op.drop_table("poc_documentos")
    op.drop_table("pocs")
    op.execute("DROP TYPE IF EXISTS status_item")
    op.execute("DROP TYPE IF EXISTS condicao_item")
    op.execute("DROP TYPE IF EXISTS status_extracao")
    op.execute("DROP TYPE IF EXISTS status_poc")
