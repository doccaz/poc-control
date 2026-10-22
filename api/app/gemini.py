import math

from google import genai
from google.genai import types

from app.config import settings

EMBEDDING_DIM = 1536
_MODEL = "gemini-embedding-001"


def _normalize(values: list[float]) -> list[float]:
    norm = math.sqrt(sum(v * v for v in values))
    if norm == 0:
        return values
    return [v / norm for v in values]


def embed_document(texto: str) -> list[float]:
    client = genai.Client(api_key=settings.gemini_api_key)
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
