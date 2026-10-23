import uuid

from sqlalchemy.orm import Session

from app.gemini import (
    CandidatoProcedimento,
    classificar_viabilidade,
    confirmar_match,
    embed_query,
    pesquisar_viabilidade_web,
)
from app.models import (
    Classificacao,
    FlagClassificacao,
    Item,
    OrigemClassificacao,
    Procedimento,
    ProcedimentoChunk,
    StatusProcedimento,
)

TOP_K = 5


def texto_item(item: Item) -> str:
    partes = [item.titulo]
    if item.descricao:
        partes.append(item.descricao)
    if item.criterio_aceite:
        partes.append(f"Critério de aceite: {item.criterio_aceite}")
    return "\n".join(partes)


def _buscar_candidatos(db: Session, vetor: list[float]) -> list[ProcedimentoChunk]:
    return (
        db.query(ProcedimentoChunk)
        .join(Procedimento)
        .filter(Procedimento.status == StatusProcedimento.validado)
        .order_by(ProcedimentoChunk.embedding.cosine_distance(vetor))
        .limit(TOP_K)
        .all()
    )


def _salvar_auto(
    db: Session,
    item: Item,
    *,
    flag: FlagClassificacao,
    justificativa: str,
    fontes: list[dict],
    procedimento_id: uuid.UUID | None,
) -> Classificacao:
    classificacao = item.classificacao
    if classificacao is None:
        classificacao = Classificacao(item_id=item.id)
        db.add(classificacao)

    classificacao.flag = flag
    classificacao.origem = OrigemClassificacao.auto
    classificacao.justificativa = justificativa
    classificacao.fontes = fontes
    classificacao.procedimento_id = procedimento_id

    db.commit()
    db.refresh(classificacao)
    return classificacao


def classificar_item(db: Session, item: Item, api_key: str | None = None) -> Classificacao:
    """Semáforo: busca vetorial nos procedimentos validados → confirmação pelo Gemini →
    se não houver match, pesquisa de viabilidade na web com grounding do Google Search."""
    texto = texto_item(item)

    chunks = _buscar_candidatos(db, embed_query(texto, api_key=api_key))
    if chunks:
        candidatos = [
            CandidatoProcedimento(
                titulo_procedimento=c.procedimento.titulo,
                heading_title=c.heading_title,
                content_text=c.content_text,
            )
            for c in chunks
        ]
        confirmacao = confirmar_match(texto, candidatos, api_key=api_key)
        if confirmacao.atende and 0 <= confirmacao.indice_candidato < len(chunks):
            procedimento = chunks[confirmacao.indice_candidato].procedimento
            return _salvar_auto(
                db,
                item,
                flag=FlagClassificacao.verde,
                justificativa=confirmacao.justificativa,
                fontes=[],
                procedimento_id=procedimento.id,
            )

    texto_pesquisa, fontes = pesquisar_viabilidade_web(texto, api_key=api_key)
    avaliacao = classificar_viabilidade(texto_pesquisa, api_key=api_key)
    fontes_dump = [f.model_dump() for f in fontes]

    if avaliacao.nao_suportado:
        flag = FlagClassificacao.vermelho
        justificativa = avaliacao.justificativa
    elif avaliacao.evidencia_viavel:
        flag = FlagClassificacao.amarelo
        justificativa = avaliacao.justificativa
    else:
        flag = FlagClassificacao.amarelo
        justificativa = f"Amarelo — baixa confiança (sem evidência de viabilidade). {avaliacao.justificativa}".strip()

    return _salvar_auto(db, item, flag=flag, justificativa=justificativa, fontes=fontes_dump, procedimento_id=None)
