import enum
import uuid
from datetime import date, datetime, timezone

from pgvector.sqlalchemy import Vector
from sqlalchemy import ARRAY, Date, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.gemini import EMBEDDING_DIM


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
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
