import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.models import StatusProcedimento


class SecaoOut(BaseModel):
    heading_level: int
    heading_title: str
    parent_heading_title: str | None
    order_index: int


class ProcedimentoListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    titulo: str
    tags: list[str]
    cliente_origem: str | None
    status: StatusProcedimento
    versao: int
    data_origem: date | None
    created_at: datetime


class ProcedimentoDetail(ProcedimentoListItem):
    html_original: str
    secoes: list[SecaoOut]
