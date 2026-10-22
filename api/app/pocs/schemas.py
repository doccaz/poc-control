import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.models import CondicaoItem, StatusExtracao, StatusItem, StatusPoc


class FaseOut(BaseModel):
    numero: int
    titulo: str
    descricao: str


class PrerequisitoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    titulo: str
    descricao: str | None
    atendido: bool
    ordem: int


class PrerequisitoUpdate(BaseModel):
    atendido: bool


class ItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    codigo: str
    titulo: str
    descricao: str | None
    criterio_aceite: str | None
    categoria: str | None
    fase: int
    ref: str | None
    conducao: CondicaoItem | None
    status: StatusItem
    ordem: int


class ItemUpdate(BaseModel):
    titulo: str | None = None
    descricao: str | None = None
    criterio_aceite: str | None = None
    categoria: str | None = None
    fase: int | None = None
    ref: str | None = None
    conducao: CondicaoItem | None = None
    status: StatusItem | None = None


class PocListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    titulo: str
    cliente: str
    status: StatusPoc
    status_extracao: StatusExtracao
    created_at: datetime
    total_itens: int
    itens_concluidos: int


class PocDetail(PocListItem):
    escopo: str | None
    erro_extracao: str | None
    fases: list[FaseOut]
    itens: list[ItemOut]
    prerequisitos: list[PrerequisitoOut]
