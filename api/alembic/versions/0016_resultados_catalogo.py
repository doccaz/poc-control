"""itens vindos do planejador (catalogo_id, resultado, aderencia...) e histórico anônimo resultados_catalogo

Revision ID: 0016
Revises: 0015
Create Date: 2026-10-29

ADR 1 (poc-planner/docs/adr/ADR-0001-poc-record.md), fatia 1. Só acrescenta: colunas anuláveis em `itens`, um valor no
enum `condicao_item` e uma tabela nova. Itens e PoCs existentes não mudam.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0016"
down_revision: Union[str, None] = "0015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

RESULTADOS = ("pending", "scheduled", "running", "pass", "partial", "fail", "na")
PRIORIDADES = ("must", "nice")
ADERENCIAS = ("native", "config", "rancher", "third", "validate", "gap")
ORIGENS = ("manual", "historico", "web", "documento")


def upgrade() -> None:
    # ADD VALUE não pode rodar dentro de uma transação em todas as versões do Postgres; o bloco abaixo sai dela.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE condicao_item ADD VALUE IF NOT EXISTS 'parceiro'")

    resultado = postgresql.ENUM(*RESULTADOS, name="resultado_item", create_type=False)
    prioridade = postgresql.ENUM(*PRIORIDADES, name="prioridade_item", create_type=False)
    aderencia = postgresql.ENUM(*ADERENCIAS, name="aderencia_item", create_type=False)
    origem = postgresql.ENUM(*ORIGENS, name="aderencia_origem", create_type=False)
    for e in (resultado, prioridade, aderencia, origem):
        e.create(op.get_bind(), checkfirst=True)

    op.add_column("itens", sa.Column("catalogo_id", sa.String(80), nullable=True))
    op.add_column("itens", sa.Column("planner_id", sa.String(40), nullable=True))
    op.add_column("itens", sa.Column("resultado", resultado, nullable=True))
    op.add_column("itens", sa.Column("prioridade", prioridade, nullable=True))
    op.add_column("itens", sa.Column("aderencia", aderencia, nullable=True))
    op.add_column("itens", sa.Column("aderencia_origem", origem, nullable=True))
    op.add_column("itens", sa.Column("responsavel", sa.String(255), nullable=True))

    op.create_table(
        "resultados_catalogo",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("catalogo_id", sa.String(80), nullable=False),
        sa.Column("resultado", resultado, nullable=False),
        sa.Column("aderencia", aderencia, nullable=True),
        sa.Column("sucesso", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("executado_em", sa.Date(), nullable=False),
        sa.Column("poc_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pocs.id", ondelete="SET NULL"), nullable=True),
    )
    op.create_index("ix_resultados_catalogo_catalogo_id", "resultados_catalogo", ["catalogo_id"])


def downgrade() -> None:
    op.drop_index("ix_resultados_catalogo_catalogo_id", table_name="resultados_catalogo")
    op.drop_table("resultados_catalogo")
    for col in ("responsavel", "aderencia_origem", "aderencia", "prioridade", "resultado", "planner_id", "catalogo_id"):
        op.drop_column("itens", col)
    for nome in ("aderencia_origem", "aderencia_item", "prioridade_item", "resultado_item"):
        op.execute(f"DROP TYPE IF EXISTS {nome}")
    # O valor 'parceiro' de condicao_item não é removido: o Postgres não tem DROP VALUE e o valor é inofensivo.
