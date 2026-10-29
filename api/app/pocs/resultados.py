"""Histórico de resultados por teste do catálogo do planejador (ADR 1, fatia 1).

Cada item vindo do planejador (`Item.catalogo_id`) com resultado terminal vira uma linha em `resultados_catalogo`,
anônima e sem cascata: ela sobrevive à exclusão da PoC. Daí sai a viabilidade por histórico."""

from datetime import date

from sqlalchemy.orm import Session

from app.models import AderenciaItem, Item, ResultadoCatalogo, ResultadoItem, StatusHistorico, StatusItem

# Só estes resultados contam como "execução" de um teste; pending/scheduled/running/na não são resultado.
RESULTADOS_TERMINAIS = (ResultadoItem.pass_, ResultadoItem.partial, ResultadoItem.fail)
# Da mais nativa para a menos (mesma ordem do TEST_FIT do planejador).
ORDEM_ADERENCIA = (
    AderenciaItem.native, AderenciaItem.config, AderenciaItem.rancher, AderenciaItem.third, AderenciaItem.validate,
    AderenciaItem.gap,
)


def item_executado_sem_problemas(db: Session, item: Item) -> bool:
    """`resultado = pass` e nenhuma transição do item para `bloqueado` (definição da ADR 1)."""
    if item.resultado != ResultadoItem.pass_:
        return False
    bloqueou = (
        db.query(StatusHistorico.id)
        .filter(StatusHistorico.item_id == item.id, StatusHistorico.status_novo == StatusItem.bloqueado)
        .first()
    )
    return bloqueou is None


def sincronizar_resultado_catalogo(db: Session, item: Item, resultado_mudou: bool = True, hoje: date | None = None) -> None:
    """Grava (ou atualiza, ou remove) a linha do histórico deste item. Não faz commit: quem chama decide."""
    if not item.catalogo_id:
        return
    linha = (
        db.query(ResultadoCatalogo)
        .filter(ResultadoCatalogo.poc_id == item.poc_id, ResultadoCatalogo.catalogo_id == item.catalogo_id)
        .first()
    )
    if item.resultado not in RESULTADOS_TERMINAIS:
        # Um resultado que deixou de ser terminal (voltou a pendente, virou N/A) não é mais uma execução.
        if linha is not None:
            db.delete(linha)
        return
    if linha is None:
        linha = ResultadoCatalogo(poc_id=item.poc_id, catalogo_id=item.catalogo_id, executado_em=hoje or date.today())
        db.add(linha)
    elif resultado_mudou:
        linha.executado_em = hoje or date.today()
    linha.resultado = item.resultado
    linha.aderencia = item.aderencia
    linha.sucesso = item_executado_sem_problemas(db, item)


def historico_por_catalogo(db: Session, ids: list[str]) -> dict[str, dict]:
    """Por id de catálogo: quantas execuções, quantas com sucesso e a aderência mais nativa entre as com sucesso
    (None sem histórico). É uma SUGESTÃO: quem confirma é o engenheiro."""
    out = {i: {"runs": 0, "successes": 0, "suggestedFit": None} for i in ids}
    if not ids:
        return out
    for linha in db.query(ResultadoCatalogo).filter(ResultadoCatalogo.catalogo_id.in_(ids)).all():
        r = out[linha.catalogo_id]
        r["runs"] += 1
        if linha.sucesso:
            r["successes"] += 1
            if linha.aderencia is not None:
                atual = r["suggestedFit"]
                if atual is None or ORDEM_ADERENCIA.index(linha.aderencia) < ORDEM_ADERENCIA.index(AderenciaItem(atual)):
                    r["suggestedFit"] = linha.aderencia.value
    return out
