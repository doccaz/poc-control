import math
import time

from google import genai
from google.genai import types
from google.genai import errors as genai_errors
from pydantic import BaseModel

from app.config import settings

EMBEDDING_DIM = 1536
_MODEL = "gemini-embedding-001"
_TEXT_MODEL = "gemini-3.8-flash"


def _client() -> genai.Client:
    return genai.Client(api_key=settings.gemini_api_key)


def _normalize(values: list[float]) -> list[float]:
    norm = math.sqrt(sum(v * v for v in values))
    if norm == 0:
        return values
    return [v / norm for v in values]


def embed_document(texto: str) -> list[float]:
    client = _client()
    result = client.models.embed_content(
        model=_MODEL,
        contents=texto,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_DOCUMENT",
            output_dimensionality=EMBEDDING_DIM,
        ),
    )
    [embedding] = result.embeddings
    return _normalize(embedding.values)


def embed_query(texto: str) -> list[float]:
    client = _client()
    result = client.models.embed_content(
        model=_MODEL,
        contents=texto,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_QUERY",
            output_dimensionality=EMBEDDING_DIM,
        ),
    )
    [embedding] = result.embeddings
    return _normalize(embedding.values)


class FaseExtraida(BaseModel):
    numero: int
    titulo: str
    descricao: str


class ItemExtraido(BaseModel):
    codigo: str
    titulo: str
    descricao: str
    criterio_aceite: str
    categoria: str
    fase: int
    ref: str = ""


class PrerequisitoExtraido(BaseModel):
    titulo: str
    descricao: str


class ExtracaoPoc(BaseModel):
    titulo_sugerido: str
    cliente_sugerido: str
    fases: list[FaseExtraida]
    itens: list[ItemExtraido]
    prerequisitos: list[PrerequisitoExtraido]


_EXTRACAO_PROMPT = """\
Você é um Solutions Architect lendo um documento de escopo/plano de testes de uma PoC (prova de conceito) \
técnica para extrair uma estrutura de acompanhamento.

Devolva:
- titulo_sugerido: título curto da PoC (produto/tecnologia principal).
- cliente_sugerido: nome do cliente, se identificável no documento (senão string vazia).
- fases: agrupamento lógico do plano de testes em fases sequenciais (ex.: "Instalação e arquitetura", \
"Redes", "Storage", "Alta disponibilidade"...). Use as fases já indicadas no documento se existirem; \
senão, agrupe os itens por tema técnico em fases sensatas, numeradas a partir de 1.
- itens: cada cenário/caso de teste do plano, com:
  - codigo: identificador curto (reaproveite a numeração do documento se houver, ex. "3.2"; senão gere \
sequencial dentro da fase, ex. "1.1", "1.2").
  - titulo: frase curta do que será testado/demonstrado.
  - descricao: o que o teste envolve.
  - criterio_aceite: o que caracteriza sucesso (se o documento não disser explicitamente, infira algo \
razoável a partir do título/descrição).
  - categoria: área técnica (ex.: "Virtualização", "Storage", "Rede", "Segurança", "Banco de Dados", \
"Backup", "DR").
  - fase: número da fase (da lista "fases" acima) a que esse item pertence.
  - ref: referência à seção/página do documento original, se houver (senão string vazia).
- prerequisitos: pré-requisitos técnicos mencionados no documento (hardware, rede, acessos, software, \
times envolvidos) como título curto + descrição. Lista vazia se o documento não tratar disso.

Responda só com os dados pedidos, em português, sem inventar itens que não tenham base no documento.
"""


_RETRY_CODES = {429, 500, 503}


def extrair_itens_poc(pdf_bytes: bytes) -> ExtracaoPoc:
    client = _client()
    tentativas = 4
    espera = 5
    ultimo_erro: Exception | None = None

    for tentativa in range(tentativas):
        try:
            response = client.models.generate_content(
                model=_TEXT_MODEL,
                contents=[
                    types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf"),
                    _EXTRACAO_PROMPT,
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ExtracaoPoc,
                ),
            )
            parsed = response.parsed
            if isinstance(parsed, ExtracaoPoc):
                return parsed
            return ExtracaoPoc.model_validate_json(response.text)
        except genai_errors.APIError as exc:
            ultimo_erro = exc
            if getattr(exc, "code", None) not in _RETRY_CODES or tentativa == tentativas - 1:
                raise
            time.sleep(espera)
            espera *= 2

    assert ultimo_erro is not None
    raise ultimo_erro
