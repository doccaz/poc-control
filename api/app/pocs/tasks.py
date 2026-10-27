import logging
import uuid

from app.db import SessionLocal
from app.gemini import extrair_itens_poc, interpretar_erro_gemini, modelo_efetivo
from app.models import Item, Poc, Prerequisito, StatusExtracao

logger = logging.getLogger(__name__)


def processar_extracao(
    poc_id: uuid.UUID,
    pdf_bytes: bytes | None,
    texto: str | None = None,
    api_key: str | None = None,
    model: str | None = None,
) -> None:
    db = SessionLocal()
    try:
        poc = db.get(Poc, poc_id)
        if poc is None:
            return

        poc.modelo_extracao = modelo_efetivo(model)

        try:
            extraido = extrair_itens_poc(pdf_bytes=pdf_bytes, texto=texto, api_key=api_key, model=model)
        except Exception as exc:  # noqa: BLE001 - precisa capturar qualquer erro da chamada ao Gemini
            logger.exception("Falha ao extrair itens da PoC %s (modelo=%s)", poc_id, model)
            poc.status_extracao = StatusExtracao.erro
            poc.erro_extracao = interpretar_erro_gemini(exc)
            db.commit()
            return

        poc.fases = [f.model_dump() for f in extraido.fases]

        for i, item in enumerate(extraido.itens):
            db.add(
                Item(
                    poc_id=poc.id,
                    codigo=item.codigo,
                    titulo=item.titulo,
                    descricao=item.descricao,
                    criterio_aceite=item.criterio_aceite,
                    categoria=item.categoria,
                    fase=item.fase,
                    ref=item.ref or None,
                    ordem=i,
                )
            )

        for i, pre in enumerate(extraido.prerequisitos):
            db.add(
                Prerequisito(
                    poc_id=poc.id,
                    titulo=pre.titulo,
                    descricao=pre.descricao,
                    ordem=i,
                )
            )

        poc.status_extracao = StatusExtracao.pronto
        db.commit()
    finally:
        db.close()
