import logging
import uuid

from app.db import SessionLocal
from app.gemini import (
    extrair_itens_poc,
    extrair_projeto_planejador,
    interpretar_erro_gemini,
    modelo_efetivo,
)
from app.models import Item, Poc, Prerequisito, StatusExtracao

logger = logging.getLogger(__name__)

_PRODUTOS_PLANEJADOR = (
    "virtualization",
    "rancher",
    "security",
    "storage",
    "observability",
    "registry",
    "appcollection",
    "manager",
)


def processar_extracao(
    poc_id: uuid.UUID,
    pdf_bytes: bytes | None,
    texto: str | None = None,
    api_key: str | None = None,
    model: str | None = None,
    hidratar_planejador: bool = False,
) -> None:
    db = SessionLocal()
    try:
        poc = db.get(Poc, poc_id)
        if poc is None:
            return

        poc.modelo_extracao = modelo_efetivo(model)

        try:
            if hidratar_planejador:
                extraido = extrair_projeto_planejador(
                    pdf_bytes=pdf_bytes, texto=texto, api_key=api_key, model=model
                )
            else:
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

        # Só nesse fluxo (import a partir do planejador) título/cliente podem ter ficado em
        # branco na criação -- no fluxo de hoje (criar_poc) o usuário já os preenche antes do
        # upload, então isso nunca sobrescreve o que a pessoa digitou.
        if hidratar_planejador:
            if not poc.titulo:
                poc.titulo = extraido.titulo_sugerido or "PoC sem título"
            if not poc.cliente:
                poc.cliente = extraido.cliente_sugerido or ""

            h = extraido.hidratacao
            produtos_detectados = set(h.produtos_detectados) & set(_PRODUTOS_PLANEJADOR)
            poc.parametros_tecnicos = {
                **(poc.parametros_tecnicos or {}),
                "hidratacao_planejador": {
                    "responsavel": h.responsavel_sugerido,
                    "email": h.email_responsavel_sugerido,
                    "produtos": {p: (p in produtos_detectados) for p in _PRODUTOS_PLANEJADOR},
                    "rede": {
                        "managementCidr": h.rede_cidr_gerenciamento,
                        "gatewayIp": h.rede_gateway,
                        "clusterVip": h.rede_vip_cluster,
                        "ipPoolStart": h.rede_pool_ip_inicio,
                        "ipPoolEnd": h.rede_pool_ip_fim,
                    },
                },
            }

        poc.status_extracao = StatusExtracao.pronto
        db.commit()
    finally:
        db.close()
