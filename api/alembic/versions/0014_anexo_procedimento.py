"""track which procedimento an anexo was promoted to (anexos.procedimento_id)

Revision ID: 0014
Revises: 0013
Create Date: 2026-10-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0014"
down_revision: Union[str, None] = "0013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("anexos", sa.Column("procedimento_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "anexos_procedimento_id_fkey", "anexos", "procedimentos", ["procedimento_id"], ["id"], ondelete="SET NULL"
    )


def downgrade() -> None:
    op.drop_constraint("anexos_procedimento_id_fkey", "anexos", type_="foreignkey")
    op.drop_column("anexos", "procedimento_id")
