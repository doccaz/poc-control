import enum
import uuid
from datetime import date, datetime, timezone

from pgvector.sqlalchemy import Vector
from sqlalchemy import ARRAY, Boolean, Date, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.gemini import EMBEDDING_DIM


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class StatusProcedimento(str, enum.Enum):
    rascunho = "rascunho"
    validado = "validado"


class Procedimento(Base):
    __tablename__ = "procedimentos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    titulo: Mapped[str] = mapped_column(String(255), nullable=False)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    cliente_origem: Mapped[str | None] = mapped_column(String(255), nullable=True)
    data_origem: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[StatusProcedimento] = mapped_column(
        Enum(StatusProcedimento, name="status_procedimento"), default=StatusProcedimento.rascunho
    )
    versao: Mapped[int] = mapped_column(Integer, default=1)
    html_original: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    chunks: Mapped[list["ProcedimentoChunk"]] = relationship(
        back_populates="procedimento", cascade="all, delete-orphan", order_by="ProcedimentoChunk.order_index"
    )


class ProcedimentoChunk(Base):
    __tablename__ = "procedimento_chunks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    procedimento_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("procedimentos.id", ondelete="CASCADE"), nullable=False
    )
    heading_level: Mapped[int] = mapped_column(Integer, nullable=False)
    heading_title: Mapped[str] = mapped_column(String(255), nullable=False)
    parent_heading_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content_text: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float]] = mapped_column(Vector(EMBEDDING_DIM), nullable=False)

    procedimento: Mapped[Procedimento] = relationship(back_populates="chunks")


class StatusPoc(str, enum.Enum):
    ativa = "ativa"
    concluida = "concluida"
    suspensa = "suspensa"


class StatusExtracao(str, enum.Enum):
    extraindo = "extraindo"
    pronto = "pronto"
    erro = "erro"


class Poc(Base):
    __tablename__ = "pocs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    titulo: Mapped[str] = mapped_column(String(255), nullable=False)
    cliente: Mapped[str] = mapped_column(String(255), nullable=False)
    escopo: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[StatusPoc] = mapped_column(Enum(StatusPoc, name="status_poc"), default=StatusPoc.ativa)
    status_extracao: Mapped[StatusExtracao] = mapped_column(
        Enum(StatusExtracao, name="status_extracao"), default=StatusExtracao.extraindo
    )
    erro_extracao: Mapped[str | None] = mapped_column(Text, nullable=True)
    fases: Mapped[list[dict] | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    documentos: Mapped[list["PocDocumento"]] = relationship(
        back_populates="poc", cascade="all, delete-orphan", order_by="PocDocumento.created_at"
    )
    itens: Mapped[list["Item"]] = relationship(
        back_populates="poc", cascade="all, delete-orphan", order_by="Item.fase, Item.ordem"
    )
    prerequisitos: Mapped[list["Prerequisito"]] = relationship(
        back_populates="poc", cascade="all, delete-orphan", order_by="Prerequisito.ordem"
    )


class PocDocumento(Base):
    __tablename__ = "poc_documentos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    poc_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("pocs.id", ondelete="CASCADE"))
    nome_arquivo: Mapped[str] = mapped_column(String(255), nullable=False)
    caminho_arquivo: Mapped[str] = mapped_column(String(500), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    poc: Mapped[Poc] = relationship(back_populates="documentos")


class StatusItem(str, enum.Enum):
    pendente = "pendente"
    em_andamento = "em_andamento"
    concluido = "concluido"
    bloqueado = "bloqueado"
    nao_aplicavel = "nao_aplicavel"


class CondicaoItem(str, enum.Enum):
    suse = "suse"
    cliente = "cliente"
    lateral = "lateral"


class Item(Base):
    __tablename__ = "itens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    poc_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pocs.id", ondelete="CASCADE"), nullable=False
    )
    codigo: Mapped[str] = mapped_column(String(50), nullable=False)
    titulo: Mapped[str] = mapped_column(String(500), nullable=False)
    descricao: Mapped[str | None] = mapped_column(Text, nullable=True)
    criterio_aceite: Mapped[str | None] = mapped_column(Text, nullable=True)
    categoria: Mapped[str | None] = mapped_column(String(255), nullable=True)
    fase: Mapped[int] = mapped_column(Integer, default=1)
    ref: Mapped[str | None] = mapped_column(String(255), nullable=True)
    conducao: Mapped[CondicaoItem | None] = mapped_column(
        Enum(CondicaoItem, name="condicao_item"), nullable=True
    )
    status: Mapped[StatusItem] = mapped_column(Enum(StatusItem, name="status_item"), default=StatusItem.pendente)
    ordem: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    poc: Mapped[Poc] = relationship(back_populates="itens")


class Prerequisito(Base):
    __tablename__ = "poc_prerequisitos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    poc_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pocs.id", ondelete="CASCADE"), nullable=False
    )
    titulo: Mapped[str] = mapped_column(String(255), nullable=False)
    descricao: Mapped[str | None] = mapped_column(Text, nullable=True)
    atendido: Mapped[bool] = mapped_column(Boolean, default=False)
    ordem: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    poc: Mapped[Poc] = relationship(back_populates="prerequisitos")
