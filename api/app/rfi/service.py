from sqlalchemy.orm import Session

from app.gemini import classificar_atendimento_rfi, modelo_efetivo, pesquisar_atendimento_rfi
from app.models import OrigemClassificacao, RfiItem, VeredictoRfi


def texto_item_rfi(item: RfiItem) -> str:
    partes = [item.codigo]
    if item.categoria:
        partes.append(item.categoria)
    partes.append(item.descricao)
    return " — ".join(partes)


def avaliar_item_rfi(db: Session, item: RfiItem, api_key: str | None = None, model: str | None = None) -> RfiItem:
    """Semáforo de 4 estados do RFI: pesquisa com grounding do Google Search → classificação \
    numa chamada separada (mesma limitação de grounding+response_schema do semáforo de PoC, \
    ver app/classificacao/service.py::classificar_item). Sem etapa de "procedimento interno" \
    aqui -- RFI é sobre capacidade de produto, não sobre um passo a passo já validado."""
    texto = texto_item_rfi(item)
    modelo_usado = modelo_efetivo(model)

    texto_pesquisa, fontes = pesquisar_atendimento_rfi(texto, api_key=api_key, model=model)
    avaliacao = classificar_atendimento_rfi(texto_pesquisa, api_key=api_key, model=model)

    if avaliacao.nao_atende:
        veredito = VeredictoRfi.nao_atende
    elif avaliacao.atende_totalmente:
        veredito = VeredictoRfi.atende
    elif avaliacao.atende_parcialmente:
        veredito = VeredictoRfi.atende_parcial
    else:
        veredito = VeredictoRfi.sem_evidencia

    item.veredito = veredito
    item.justificativa = avaliacao.justificativa
    item.fontes = [f.model_dump() for f in fontes]
    item.origem = OrigemClassificacao.auto
    item.modelo = modelo_usado

    db.commit()
    db.refresh(item)
    return item
