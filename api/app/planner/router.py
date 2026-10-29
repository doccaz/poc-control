import json
import pathlib

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, Field

from app.deps import get_current_user
from app.gemini import interpretar_erro_gemini
from app.gemini_key import resolve_api_key, resolve_model
from app.models import User
from app.planner.service import (
    LIMITE_TESTES_ADERENCIA,
    extrair_hidratacao,
    sugerir_aderencia,
    validar_catalogo,
)
from app.pocs.planilha_import import texto_de_planilha

# Recursos do "SUSE PoC Planner" (poc-planner/index.html) que precisam de servidor. Todos sem estado:
# nada é gravado no banco aqui (o registro único da PoC é a ADR 1 do plano de unificação).
router = APIRouter(prefix="/api/planner", tags=["planner"])

_LIMITE_ARQUIVO = 25 * 1024 * 1024


@router.get("/capabilities")
def capabilities():
    """Sem autenticação e sem corpo de entrada: é como o planejador descobre que está servido por um
    poc-control (e só então mostra os controles extras). Não revela nada além da lista de recursos."""
    return {"kind": "poc-control", "schema": 1, "features": ["hydrate", "feasibility", "procedures"]}


@router.post("/hydrate")
def hydrate(
    arquivo: UploadFile | None = File(None),
    texto: str | None = Form(None),
    catalogo: str = Form(...),
    current_user: User = Depends(get_current_user),
):
    """Documento do cliente -> sugestões para o planejador (formato `suse-poc-hydration`). Síncrono: o
    planejador mostra uma tela de revisão com a resposta. Aceita PDF, XLSX/CSV, JSON/texto (UTF-8) ou texto colado."""
    try:
        cat = validar_catalogo(catalogo)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))

    pdf_bytes: bytes | None = None
    texto_arquivo: str | None = None
    if arquivo is not None and arquivo.filename:
        conteudo = arquivo.file.read(_LIMITE_ARQUIVO + 1)
        if not conteudo:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Arquivo vazio")
        if len(conteudo) > _LIMITE_ARQUIVO:
            raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Arquivo maior que 25 MB")
        extensao = pathlib.Path(arquivo.filename).suffix.lower()
        if extensao == ".pdf":
            pdf_bytes = conteudo
        elif extensao in (".xlsx", ".csv"):
            try:
                texto_arquivo = texto_de_planilha(conteudo, extensao)
            except ValueError as exc:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))
        else:
            try:
                texto_arquivo = conteudo.decode("utf-8")
            except UnicodeDecodeError:
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    "Não foi possível ler o arquivo como texto; envie PDF, XLSX/CSV ou texto/JSON em UTF-8",
                )
    texto_final = (texto or "").strip() or texto_arquivo
    if not pdf_bytes and not texto_final:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Envie um arquivo ou cole o texto")

    try:
        return extrair_hidratacao(
            pdf_bytes, texto_final, cat, resolve_api_key(current_user), resolve_model(current_user)
        )
    except Exception as exc:  # noqa: BLE001 - qualquer erro da chamada ao Gemini vira 502 com mensagem acionável
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, interpretar_erro_gemini(exc))


class TesteAderencia(BaseModel):
    id: str = Field(max_length=80)
    product: str = Field(default="", max_length=40)
    title: str = Field(max_length=300)
    expected: str = Field(default="", max_length=600)


class AderenciaIn(BaseModel):
    lang: str = "pt"
    fits: list[str] = []
    tests: list[TesteAderencia] = Field(min_length=1, max_length=LIMITE_TESTES_ADERENCIA)


@router.post("/feasibility")
def feasibility(payload: AderenciaIn, current_user: User = Depends(get_current_user)):
    """Sugestão de aderência por pesquisa na web (Gemini com grounding), uma categoria do planejador por
    teste. Sem estado: o planejador guarda como sugestão externa não confirmada."""
    api_key, model = resolve_api_key(current_user), resolve_model(current_user)
    resultados = []
    for t in payload.tests:
        try:
            resultados.append(sugerir_aderencia(t.model_dump(), payload.fits, payload.lang, api_key, model))
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, interpretar_erro_gemini(exc))
    return {"kind": "suse-poc-feasibility", "schema": 1, "results": resultados}
