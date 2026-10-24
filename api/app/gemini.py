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


def _client(api_key: str | None = None) -> genai.Client:
    return genai.Client(api_key=api_key or settings.gemini_api_key)


def _normalize(values: list[float]) -> list[float]:
    norm = math.sqrt(sum(v * v for v in values))
    if norm == 0:
        return values
    return [v / norm for v in values]


def embed_document(texto: str, api_key: str | None = None) -> list[float]:
    client = _client(api_key)
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


def embed_query(texto: str, api_key: str | None = None) -> list[float]:
    client = _client(api_key)
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

O documento pode vir em formatos diferentes:
- Um PDF ou texto livre de escopo/plano de testes.
- Um JSON exportado pela ferramenta interna de planejamento de PoC ("SUSE PoC Planner"), com campos como \
`project.projectName`, `project.clientOrganization`, `selectedProducts` (produtos habilitados) e \
`testCases` (um array de casos de teste por produto, cada um com `text`, `fit`, `led`, `owner`, \
`evidence`, `notes`). Se for esse JSON: use `project.projectName` como título sugerido e \
`project.clientOrganization` (ou `project.organization`) como cliente sugerido; agrupe os itens por \
produto (as chaves marcadas `true` em `selectedProducts`) como fases; cada entrada de \
`testCases[<produto>]` é um item, com `titulo` a partir de `text`, `categoria` a partir do nome do \
produto, e `criterio_aceite` inferido do próprio `text` (esse formato não tem um campo de critério \
separado).

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


def _gerar_com_retry(*, api_key: str | None = None, **kwargs) -> types.GenerateContentResponse:
    client = _client(api_key)
    tentativas = 4
    espera = 5
    ultimo_erro: Exception | None = None

    for tentativa in range(tentativas):
        try:
            return client.models.generate_content(**kwargs)
        except genai_errors.APIError as exc:
            ultimo_erro = exc
            if getattr(exc, "code", None) not in _RETRY_CODES or tentativa == tentativas - 1:
                raise
            time.sleep(espera)
            espera *= 2

    assert ultimo_erro is not None
    raise ultimo_erro


def extrair_itens_poc(
    pdf_bytes: bytes | None = None, texto: str | None = None, api_key: str | None = None
) -> ExtracaoPoc:
    if pdf_bytes:
        conteudo: list = [types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf")]
    elif texto:
        conteudo = [texto]
    else:
        raise ValueError("Informe pdf_bytes ou texto")
    conteudo.append(_EXTRACAO_PROMPT)

    response = _gerar_com_retry(
        api_key=api_key,
        model=_TEXT_MODEL,
        contents=conteudo,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ExtracaoPoc,
        ),
    )
    parsed = response.parsed
    if isinstance(parsed, ExtracaoPoc):
        return parsed
    return ExtracaoPoc.model_validate_json(response.text)


class CandidatoProcedimento(BaseModel):
    titulo_procedimento: str
    heading_title: str
    content_text: str


class ConfirmacaoMatch(BaseModel):
    atende: bool
    indice_candidato: int
    justificativa: str


_CONFIRMACAO_PROMPT = """\
Você é um Solutions Architect avaliando se algum procedimento já validado resolve um item de uma PoC.

Item da PoC a ser testado:
\"\"\"
{item}
\"\"\"

Candidatos encontrados por similaridade na base de procedimentos validados (cada um é um trecho/seção \
de um procedimento):
{candidatos}

Responda:
- atende: true se algum dos candidatos realmente cobre o que o item pede (não basta ser parecido no \
assunto, o passo a passo tem que resolver o item).
- indice_candidato: o número do candidato escolhido (começando em 0), ou -1 se nenhum atende.
- justificativa: 1-2 frases curtas, em português, explicando a decisão.
"""


def confirmar_match(
    item_texto: str, candidatos: list[CandidatoProcedimento], api_key: str | None = None
) -> ConfirmacaoMatch:
    candidatos_texto = "\n\n".join(
        f"[{i}] Procedimento \"{c.titulo_procedimento}\" — seção \"{c.heading_title}\":\n{c.content_text}"
        for i, c in enumerate(candidatos)
    )
    response = _gerar_com_retry(
        api_key=api_key,
        model=_TEXT_MODEL,
        contents=_CONFIRMACAO_PROMPT.format(item=item_texto, candidatos=candidatos_texto),
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ConfirmacaoMatch,
        ),
    )
    parsed = response.parsed
    if isinstance(parsed, ConfirmacaoMatch):
        return parsed
    return ConfirmacaoMatch.model_validate_json(response.text)


class FonteEvidencia(BaseModel):
    titulo: str
    url: str


_VIABILIDADE_PROMPT = """\
Pesquise na web se o item de PoC abaixo é viável/suportado ou se há evidência explícita de que NÃO é \
suportado. Responda em português, de forma objetiva, citando o que a pesquisa encontrou.

Item da PoC:
\"\"\"
{item}
\"\"\"
"""


def pesquisar_viabilidade_web(item_texto: str, api_key: str | None = None) -> tuple[str, list[FonteEvidencia]]:
    response = _gerar_com_retry(
        api_key=api_key,
        model=_TEXT_MODEL,
        contents=_VIABILIDADE_PROMPT.format(item=item_texto),
        config=types.GenerateContentConfig(tools=[types.Tool(google_search=types.GoogleSearch())]),
    )
    texto = response.text or ""

    fontes: list[FonteEvidencia] = []
    candidate = response.candidates[0] if response.candidates else None
    grounding = getattr(candidate, "grounding_metadata", None) if candidate else None
    for chunk in getattr(grounding, "grounding_chunks", None) or []:
        web = getattr(chunk, "web", None)
        if web is not None and web.uri:
            fontes.append(FonteEvidencia(titulo=web.title or web.uri, url=web.uri))

    return texto, fontes


class AvaliacaoViabilidade(BaseModel):
    nao_suportado: bool
    evidencia_viavel: bool
    justificativa: str


_AVALIACAO_PROMPT = """\
Com base no resultado de pesquisa abaixo sobre a viabilidade de um item de PoC, classifique:

Resultado da pesquisa:
\"\"\"
{pesquisa}
\"\"\"

Responda:
- nao_suportado: true SÓ se o resultado trouxer evidência explícita de que não é suportado/não é viável.
- evidencia_viavel: true se o resultado trouxer evidência de que é viável (ainda que não seja prova \
definitiva).
- justificativa: 1-2 frases curtas, em português, resumindo a evidência (ou a falta dela).
"""


def classificar_viabilidade(texto_pesquisa: str, api_key: str | None = None) -> AvaliacaoViabilidade:
    response = _gerar_com_retry(
        api_key=api_key,
        model=_TEXT_MODEL,
        contents=_AVALIACAO_PROMPT.format(pesquisa=texto_pesquisa or "(a pesquisa não retornou texto)"),
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=AvaliacaoViabilidade,
        ),
    )
    parsed = response.parsed
    if isinstance(parsed, AvaliacaoViabilidade):
        return parsed
    return AvaliacaoViabilidade.model_validate_json(response.text)


class ResumoSessaoExtraido(BaseModel):
    data: str
    participantes: list[str]
    pontos_resolvidos: list[str]
    pontos_falha: list[str]
    proximos_passos: list[str]


_RESUMO_SESSAO_PROMPT = """\
Você é um Solutions Architect organizando o registro de uma sessão de PoC a partir de um resumo em texto \
livre (gerado por outra ferramenta de IA durante a sessão com o cliente).

Texto da sessão:
\"\"\"
{texto}
\"\"\"

Extraia:
- data: a data da sessão no formato AAAA-MM-DD, se estiver identificável no texto (senão string vazia).
- participantes: nomes de pessoas mencionadas como presentes (senão lista vazia).
- pontos_resolvidos: lista curta dos pontos que foram resolvidos/concluídos na sessão.
- pontos_falha: lista curta dos pontos que falharam, ficaram bloqueados ou têm alguma pendência.
- proximos_passos: lista curta das próximas ações combinadas.

Responda em português, com frases curtas e objetivas em cada item das listas. Não invente informação que \
não esteja no texto; se uma lista não se aplicar, devolva lista vazia.
"""


def extrair_resumo_sessao(texto: str, api_key: str | None = None) -> ResumoSessaoExtraido:
    response = _gerar_com_retry(
        api_key=api_key,
        model=_TEXT_MODEL,
        contents=_RESUMO_SESSAO_PROMPT.format(texto=texto),
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ResumoSessaoExtraido,
        ),
    )
    parsed = response.parsed
    if isinstance(parsed, ResumoSessaoExtraido):
        return parsed
    return ResumoSessaoExtraido.model_validate_json(response.text)


_RESUMO_EMAIL_PROMPT = """\
Você é um Solutions Architect escrevendo um resumo formal para enviar por e-mail ao cliente sobre o \
andamento de uma PoC, com base no que aconteceu numa sessão específica.

Contexto da sessão:
\"\"\"
{contexto}
\"\"\"

Escreva um texto em português, tom formal e neutro, pronto para colar num e-mail, estruturado em:
- Um parágrafo breve de abertura mencionando a data da sessão.
- "Hoje realizamos": o que foi feito, testado ou resolvido.
- "Pendências": o que ficou com falha, bloqueado ou pendente (omita esta seção se não houver nada).
- "Próximos passos": as próximas ações combinadas (omita esta seção se não houver nada).

Não invente informação que não esteja no contexto. Não assine o e-mail nem use placeholders como \
"[Seu nome]".
"""


def gerar_resumo_email(contexto: str, api_key: str | None = None) -> str:
    response = _gerar_com_retry(
        api_key=api_key, model=_TEXT_MODEL, contents=_RESUMO_EMAIL_PROMPT.format(contexto=contexto)
    )
    return response.text or ""


_RESUMO_EXECUTIVO_PROMPT = """\
Você é um Solutions Architect preparando o sumário executivo de uma apresentação de resultados de PoC \
para o cliente, a partir do status consolidado abaixo.

Status consolidado:
\"\"\"
{contexto}
\"\"\"

Escreva um texto em português, tom formal e direto, adequado para abrir uma apresentação ao cliente \
(3 a 5 parágrafos curtos), cobrindo:
- Visão geral do que foi avaliado nesta PoC e o percentual concluído.
- Principais conquistas e pontos validados com sucesso.
- Pendências ou riscos relevantes, com linguagem profissional e sem expor mensagens de erro ou \
detalhes técnicos de depuração internos.
- Próximos passos recomendados.

Não invente informação que não esteja no status consolidado. Não assine o texto nem use placeholders \
como "[Seu nome]".
"""


def gerar_resumo_executivo(contexto: str, api_key: str | None = None) -> str:
    response = _gerar_com_retry(
        api_key=api_key, model=_TEXT_MODEL, contents=_RESUMO_EXECUTIVO_PROMPT.format(contexto=contexto)
    )
    return response.text or ""
