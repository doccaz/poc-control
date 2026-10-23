import pathlib
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.classificacao.service import classificar_item
from app.classificacao.tasks import classificar_pendentes
from app.config import settings
from app.db import get_db
from app.deps import get_current_user
from app.models import Classificacao, Item, OrigemClassificacao, Poc, PocDocumento, Prerequisito, StatusExtracao, StatusItem
from app.pocs.schemas import (
    ClassificacaoManualUpdate,
    FaseOut,
    ItemOut,
    ItemUpdate,
    PocDetail,
    PocListItem,
    PrerequisitoOut,
    PrerequisitoUpdate,
)
from app.pocs.tasks import processar_extracao

router = APIRouter(prefix="/api/pocs", tags=["pocs"], dependencies=[Depends(get_current_user)])


def _contar_itens(db: Session, poc_id: uuid.UUID) -> tuple[int, int]:
    total = db.query(func.count(Item.id)).filter(Item.poc_id == poc_id).scalar() or 0
    concluidos = (
        db.query(func.count(Item.id))
        .filter(Item.poc_id == poc_id, Item.status == StatusItem.concluido)
        .scalar()
        or 0
    )
    return total, concluidos


def _list_item(db: Session, poc: Poc) -> PocListItem:
    total, concluidos = _contar_itens(db, poc.id)
    return PocListItem(
        id=poc.id,
        titulo=poc.titulo,
        cliente=poc.cliente,
        status=poc.status,
        status_extracao=poc.status_extracao,
        created_at=poc.created_at,
        total_itens=total,
        itens_concluidos=concluidos,
    )


def _get_poc_or_404(db: Session, poc_id: uuid.UUID) -> Poc:
    poc = db.get(Poc, poc_id)
    if poc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "PoC não encontrada")
    return poc


def _get_item_or_404(db: Session, poc_id: uuid.UUID, item_id: uuid.UUID) -> Item:
    item = db.get(Item, item_id)
    if item is None or item.poc_id != poc_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item não encontrado")
    return item


@router.get("", response_model=list[PocListItem])
def listar_pocs(db: Session = Depends(get_db)):
    pocs = db.query(Poc).order_by(Poc.created_at.desc()).all()
    return [_list_item(db, poc) for poc in pocs]


@router.post("", response_model=PocListItem, status_code=status.HTTP_201_CREATED)
def criar_poc(
    background_tasks: BackgroundTasks,
    titulo: str = Form(...),
    cliente: str = Form(...),
    escopo: str = Form(""),
    arquivo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    pdf_bytes = arquivo.file.read()
    if not pdf_bytes:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Arquivo vazio")

    poc = Poc(titulo=titulo, cliente=cliente, escopo=escopo or None, status_extracao=StatusExtracao.extraindo)
    db.add(poc)
    db.commit()
    db.refresh(poc)

    poc_dir = pathlib.Path(settings.uploads_dir) / "pocs" / str(poc.id)
    poc_dir.mkdir(parents=True, exist_ok=True)
    nome_arquivo = arquivo.filename or "poc.pdf"
    caminho = poc_dir / nome_arquivo
    caminho.write_bytes(pdf_bytes)

    db.add(PocDocumento(poc_id=poc.id, nome_arquivo=nome_arquivo, caminho_arquivo=str(caminho)))
    db.commit()

    background_tasks.add_task(processar_extracao, poc.id, pdf_bytes)

    return _list_item(db, poc)


@router.get("/{poc_id}", response_model=PocDetail)
def obter_poc(poc_id: uuid.UUID, db: Session = Depends(get_db)):
    poc = _get_poc_or_404(db, poc_id)
    total, concluidos = _contar_itens(db, poc.id)
    return PocDetail(
        id=poc.id,
        titulo=poc.titulo,
        cliente=poc.cliente,
        status=poc.status,
        status_extracao=poc.status_extracao,
        created_at=poc.created_at,
        total_itens=total,
        itens_concluidos=concluidos,
        escopo=poc.escopo,
        erro_extracao=poc.erro_extracao,
        fases=[FaseOut(**f) for f in (poc.fases or [])],
        itens=[ItemOut.model_validate(i) for i in poc.itens],
        prerequisitos=[PrerequisitoOut.model_validate(p) for p in poc.prerequisitos],
    )


@router.patch("/{poc_id}/itens/{item_id}", response_model=ItemOut)
def atualizar_item(poc_id: uuid.UUID, item_id: uuid.UUID, payload: ItemUpdate, db: Session = Depends(get_db)):
    item = _get_item_or_404(db, poc_id, item_id)
    dados = payload.model_dump(exclude_unset=True)
    for campo, valor in dados.items():
        setattr(item, campo, valor)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{poc_id}/itens/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_item(poc_id: uuid.UUID, item_id: uuid.UUID, db: Session = Depends(get_db)):
    item = _get_item_or_404(db, poc_id, item_id)
    db.delete(item)
    db.commit()


@router.post("/{poc_id}/itens/{item_id}/classificar", response_model=ItemOut)
def classificar_item_individual(poc_id: uuid.UUID, item_id: uuid.UUID, db: Session = Depends(get_db)):
    item = _get_item_or_404(db, poc_id, item_id)
    classificar_item(db, item)
    db.refresh(item)
    return item


@router.patch("/{poc_id}/itens/{item_id}/classificacao", response_model=ItemOut)
def sobrescrever_classificacao(
    poc_id: uuid.UUID, item_id: uuid.UUID, payload: ClassificacaoManualUpdate, db: Session = Depends(get_db)
):
    item = _get_item_or_404(db, poc_id, item_id)

    classificacao = item.classificacao
    if classificacao is None:
        classificacao = Classificacao(item_id=item.id)
        db.add(classificacao)

    classificacao.flag = payload.flag
    classificacao.origem = OrigemClassificacao.manual
    classificacao.justificativa = payload.justificativa
    classificacao.procedimento_id = payload.procedimento_id
    if classificacao.fontes is None:
        classificacao.fontes = []

    db.commit()
    db.refresh(item)
    return item


@router.post("/{poc_id}/classificar-pendentes", status_code=status.HTTP_202_ACCEPTED)
def classificar_pendentes_da_poc(
    poc_id: uuid.UUID, background_tasks: BackgroundTasks, db: Session = Depends(get_db)
):
    _get_poc_or_404(db, poc_id)
    background_tasks.add_task(classificar_pendentes, poc_id)
    return {"status": "classificando"}


@router.patch("/{poc_id}/prerequisitos/{prereq_id}", response_model=PrerequisitoOut)
def atualizar_prerequisito(
    poc_id: uuid.UUID, prereq_id: uuid.UUID, payload: PrerequisitoUpdate, db: Session = Depends(get_db)
):
    prereq = db.get(Prerequisito, prereq_id)
    if prereq is None or prereq.poc_id != poc_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pré-requisito não encontrado")
    prereq.atendido = payload.atendido
    db.commit()
    db.refresh(prereq)
    return prereq
