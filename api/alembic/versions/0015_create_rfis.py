"""create rfis and rfi_itens (análise de TR/edital contra o portfólio SUSE)

Revision ID: 0015
Revises: 0014
Create Date: 2026-10-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0015"
down_revision: Union[str, None] = "0014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    status_extracao_enum = postgresql.ENUM(
        "extraindo", "pronto", "erro", name="status_extracao", create_type=False
    )
    origem_classificacao_enum = postgresql.ENUM(
        "auto", "manual", name="origem_classificacao", create_type=False
    )
    veredito_rfi_enum = postgresql.ENUM(
        "atende", "atende_parcial", "nao_atende", "sem_evidencia", name="veredito_rfi"
    )
    veredito_rfi_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "rfis",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("titulo", sa.String(255), nullable=False, server_default=""),
        sa.Column("orgao", sa.String(255), nullable=False, server_default=""),
        sa.Column("numero_processo", sa.String(100), nullable=True),
        sa.Column("nome_arquivo", sa.String(255), nullable=False),
        sa.Column("caminho_arquivo", sa.String(500), nullable=False),
        sa.Column("status_extracao", status_extracao_enum, nullable=False),
        sa.Column("erro_extracao", sa.Text(), nullable=True),
        sa.Column("modelo_extracao", sa.String(100), nullable=True),
        sa.Column(
            "criado_por_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "rfi_itens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "rfi_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("rfis.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("codigo", sa.String(50), nullable=False),
        sa.Column("categoria", sa.String(255), nullable=True),
        sa.Column("descricao", sa.Text(), nullable=False),
        sa.Column("ordem", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("veredito", veredito_rfi_enum, nullable=True),
        sa.Column("justificativa", sa.Text(), nullable=True),
        sa.Column("fontes", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("origem", origem_classificacao_enum, nullable=True),
        sa.Column("modelo", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("rfi_itens")
    op.drop_table("rfis")
    op.execute("DROP TYPE IF EXISTS veredito_rfi")
