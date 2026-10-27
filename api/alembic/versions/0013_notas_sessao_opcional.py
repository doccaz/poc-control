"""make notas.sessao_id optional (notes now start on the item, session is secondary)

Revision ID: 0013
Revises: 0012
Create Date: 2026-10-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0013"
down_revision: Union[str, None] = "0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("notas", "sessao_id", nullable=True)
    op.drop_constraint("notas_sessao_id_fkey", "notas", type_="foreignkey")
    op.create_foreign_key("notas_sessao_id_fkey", "notas", "sessoes", ["sessao_id"], ["id"], ondelete="SET NULL")


def downgrade() -> None:
    op.drop_constraint("notas_sessao_id_fkey", "notas", type_="foreignkey")
    op.create_foreign_key("notas_sessao_id_fkey", "notas", "sessoes", ["sessao_id"], ["id"], ondelete="CASCADE")
    op.alter_column("notas", "sessao_id", nullable=False)
