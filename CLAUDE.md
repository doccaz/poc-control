# POC Control

Ferramenta pessoal (depois, do time) para conduzir POCs de clientes: lê o PDF da POC, extrai os itens, cruza com uma base de procedimentos já validados e acompanha a execução com notas, status e resumo de sessão.

Dono: Gabriel (Solutions Architect, SUSE). Idioma da interface e dos textos gerados: **português (pt-BR)**.
A casca do app (menu, navbar, dashboard) tem opcionalmente um seletor PT/EN/ES (ver seção "Integração com
o planejador de PoC" abaixo) — isso não muda a regra acima para o conteúdo gerado pela IA nem para os
formulários de domínio do Executar PoC, que continuam só em pt-BR.

## Repositório e ambiente

- Git: `https://github.com/gbrlins/poc-control.git`
- Servidor: Raspberry Pi na rede local, acessado por SSH com o alias `rasp` (chave em `~/.ssh/rasp`, ver `~/.ssh/config`). **Nunca** usar senha nem gravar credenciais em arquivos do repositório.
- Exposição externa: `cloudflared` já instalado na Raspberry. Publicar só o serviço `web`. Recomendado proteger com Cloudflare Access além do login do app.
- Tudo roda com `docker compose` em imagens **ARM64**.

## Organização do repositório (features separadas para múltiplos times)

O front end é dividido por feature para "Executar PoC" e "Planejar PoC" avançarem em paralelo sem
pisar um no outro:

- `web/src/features/executar-poc/` — páginas desta ferramenta (POCs, Procedimentos). Dono: Gabriel.
- `web/src/features/planejar-poc/` — wrapper da rota `/plan`; o HTML estático do "SUSE PoC Planner"
  do colega mora em `web/public/planejar-poc/`. Dono: time do planejador.
- `web/src/pages/` (Layout, Sidebar, Dashboard, Login, MinhaConta, Usuarios) e `web/src/i18n.tsx` são
  a casca compartilhada pelas duas features — mudança aqui pede revisão dos dois lados.
- `api/` é 100% da feature Executar PoC (o planejador não tem backend, guarda tudo em `localStorage`).
- `.github/CODEOWNERS` mapeia esses caminhos para revisão automática; troque o placeholder pelo
  handle real de quem mantém o planejador.
- Convenção de branch: `feature/executar-poc/<nome>`, `feature/planejar-poc/<nome>` e
  `feature/shell/<nome>` para mudanças na casca compartilhada.
- Alias de import `@/` → `web/src/` (configurado em `vite.config.ts` e `tsconfig.json`), para os
  imports entre features não dependerem da profundidade relativa de cada pasta.

## Escopo atual

- **Um único usuário** (Gabriel), criado por seed a partir de variáveis do `.env` (`ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`). O modelo de dados já prevê `user_id` em tudo, para virar multiusuário depois sem migração dolorosa.
- IA: **Gemini** (chave em `GEMINI_API_KEY` no `.env`). Usar chave de plano pago, porque os documentos são de clientes do setor público.

## Conceito central: semáforo por item

Para cada item extraído do PDF da POC:

| Flag | Critério |
|---|---|
| 🟢 Verde | Existe procedimento **validado** na base e o Gemini confirma que ele atende o item. A UI mostra o link "é só seguir". |
| 🟡 Amarelo | Não há procedimento validado, mas a busca na web (Gemini com grounding do Google Search) traz evidência de viabilidade. Mostrar as fontes (links). Sem evidência alguma também cai aqui, como "amarelo — baixa confiança". |
| 🔴 Vermelho | Só com **evidência explícita** de que não é suportado ou não é viável. Mostrar as fontes. |

Regras:
- A flag é **sugestão**. O usuário pode sobrescrever a cor e o procedimento vinculado. Guardar se foi `auto` ou `manual`.
- Guardar a justificativa curta e as fontes de cada classificação.
- Reprocessar um item sob demanda (botão "reavaliar").

## Ciclo de aprendizado

Ao concluir um item, o usuário pode anexar ou escrever o passo a passo que funcionou e clicar em **"Promover a procedimento validado"**. O procedimento entra na base com embedding, e em POCs futuras itens equivalentes saem verdes.

## Procedimentos (base de conhecimento)

- Formato de entrada: **HTML** (upload). Converter para texto/markdown para indexar e guardar o HTML original para exibição.
- Indexar por **seção** (`h2`/`h3`), não o documento inteiro: cada seção é um chunk com embedding, ligado ao procedimento pai. Assim o match aponta para o passo certo.
- Metadados: título, produtos/tecnologias (tags), cliente de origem, data, status (`rascunho` | `validado`), versão.
- Os HTMLs seguem um padrão útil para extração: objetivo e fluxo no topo, "Valores desta sessão", "O que ressaltar", passos numerados com "Esperado:", "Se der erro" (tabela sintoma → causa → ação), "Limpeza" e "Evidências para o relatório".

### Carga inicial (pasta `seed/procedimentos/`)

Procedimentos da POC Sefaz-RJ, todos `validado`:
1. **Argo CD do cliente → k3s**: cadastro declarativo de cluster k3s num Argo CD no OpenShift (rede, certificado, ServiceAccount, Secret de cluster, Application, teste GitOps com rollback, limpeza).
2. **HPA em nginx no k3s com Ingress**: Deployment/Service pela UI do Rancher, HPA `autoscaling/v2`, teste de carga, Ingress Traefik com host e TLS opcional.
3. **Integração do k3s com Vault externo**: auth method Kubernetes num mount novo, credencial de revisão (`system:auth-delegator`), política KV v1, papel, pod de teste, diagnóstico de 403, opções de consumo (Agent Injector, CSI, VSO, leitura direta).

Na carga, **remover ou mascarar** dados específicos do cliente que não devem ser reutilizados (IPs, hostnames internos, nomes de repositório). Guardar a versão original separada, sem ir para o índice.

## POCs

- Upload do PDF (ou texto/JSON colado — ver "Integração com o planejador de PoC") → o Gemini lê nativamente e devolve JSON estruturado (schema fixo): `itens[] { codigo, titulo, descricao, criterio_aceite, categoria }`.
- O usuário revisa a lista extraída (editar, juntar, remover) antes de rodar a classificação.
- Cada POC tem **sessões** (data, participantes, agenda).
- Em cada item: status (`pendente` | `em_andamento` | `concluido` | `bloqueado` | `nao_aplicavel`), notas com data e sessão, anexos e procedimento vinculado.

## Resumo de sessão

Botão "Gerar resumo da sessão": a partir das notas e das mudanças de status daquela sessão, o Gemini monta um texto pronto para colar no e-mail ao cliente ("Hoje realizamos…", "Pendências…", "Próximos passos…"). Tom formal e neutro. **Não envia e-mail**: só exibe com botão de copiar. Também exportar o status da POC inteira como HTML imprimível.

## Stack

| Serviço | Tecnologia |
|---|---|
| `db` | PostgreSQL + pgvector (imagem `pgvector/pgvector`, ARM64), volume persistente |
| `api` | Python + FastAPI, SQLAlchemy + Alembic, SDK `google-genai`, tarefas em background para processar PDFs |
| `web` | React + TypeScript (Vite), servido por nginx, que também faz proxy de `/api` |

- Embeddings: modelo de embedding do Gemini (conferir o nome e a dimensão atuais na documentação antes de criar a coluna `vector`).
- Busca: similaridade de cosseno no pgvector, top-k por item, depois confirmação pelo Gemini (o match tem que fazer sentido, não só ser parecido).
- Login: sessão com cookie httpOnly; senha com hash argon2/bcrypt.

## Modelo de dados (inicial)

`users`, `clientes`, `pocs`, `poc_documentos` (PDF original), `itens`, `classificacoes` (flag, origem auto/manual, justificativa, fontes, data), `procedimentos`, `procedimento_chunks` (texto, embedding), `item_procedimento`, `sessoes`, `notas`, `anexos`, `status_historico`.

## Marcos

1. Esqueleto: `docker-compose.yml`, `.env.example`, API com healthcheck, banco com migrações, front vazio, login do usuário único. Subir na Raspberry.
2. Procedimentos: upload de HTML, chunking por seção, embeddings, listagem e visualização. Importar o `seed/`.
3. POC: upload do PDF, extração de itens, revisão da lista.
4. Classificação: busca vetorial → confirmação → grounding web → semáforo com fontes.
5. Execução: sessões, status, notas, anexos, promover a procedimento.
6. Resumo de sessão e exportação HTML.
7. Exposição via cloudflared (+ Cloudflare Access) e backup do volume do Postgres.

## Integração com o planejador de PoC (experimental, ramo `plan-poc-integration`)

- Objetivo: unir esta ferramenta (execução da PoC) com a do colega que cobre o planejamento/escopo
  (um app estático, sem backend, chamado "SUSE PoC Planner"). **Ainda não está no `main` nem deployado**
  — é uma tentativa que pode ser descartada se não fizer sentido.
- Navegação: menu hamburguer na lateral esquerda escolhe entre "Executar PoC" (este app) e "Planejar PoC".
  O topo (`.topbar`) só tem a marca "SUSE POC PLANNER" e o seletor de idioma. Os links que antes estavam na
  navbar (POCs, Procedimentos, Usuários — só admin, Minha conta) agora ficam no menu lateral.
- O planejador do colega é servido **sem modificação na lógica dele** como
  `web/public/planejar-poc/plan-poc.html` (estático, copiado de `C:\Users\Gabriel\Downloads\poc-plan.html`)
  e montado num `<iframe>` em `/plan` (`web/src/features/planejar-poc/pages/PlanPoc.tsx`). Decisão
  deliberada: não foi reescrito nem teve sua lógica portada — ele tem seu próprio assistente sequencial em
  10 etapas (projeto → produtos → infra → rede → credenciais → portas → arquitetura → testes → checklist →
  resumo), que Gabriel achou rígido demais; reescrever isso é um projeto futuro maior, não esta tarefa. Ele
  guarda estado só no `localStorage` do navegador (sem backend).
- Seletor de idioma único (`web/src/i18n.tsx`), agora **pt/en/es**: cobre a casca do app e também o
  planejador. O idioma escolhido no topbar é repassado ao iframe por `postMessage`
  (`{type:'poc-control:set-lang', lang}`) e por querystring (`?lang=`) na primeira carga; o planejador
  teve seu próprio seletor PT/EN/ES removido do header (única mudança de UI feita no `plan-poc.html` —
  a lógica de cada etapa continua intocada) para não duplicar o controle. Isso não muda a regra do topo
  deste arquivo para o conteúdo gerado pela IA nem para os formulários de domínio do Executar PoC, que
  continuam só em pt-BR — o planejador já tinha suas próprias traduções prontas nas 3 línguas antes desta
  integração.
- Planejar → Executar: a saída do planejador (JSON do botão "Exportar Projeto", na etapa Resumo — inclui
  a seção "11. Plano de testes e resultados") serve de entrada para criar uma POC em Executar PoC. Em
  "Nova POC" (`web/src/features/executar-poc/pages/PocUpload.tsx`) dá pra subir esse JSON como arquivo,
  colar o texto/JSON direto, ou (como antes) subir o PDF do cliente — os três formatos passam pelo mesmo
  endpoint (`POST /api/pocs`) e pelo mesmo prompt de extração do Gemini (`extrair_itens_poc` em
  `api/app/gemini.py`), que reconhece o formato do planejador (`project`, `selectedProducts`,
  `testCases`) e mapeia pros mesmos `itens[]`. Ainda não há ligação automática entre os dois apps (o
  planejador continua só com `localStorage`) — é import manual, sob demanda.

## Regras para o agente

- Testar cada marco na Raspberry (`ssh rasp`) antes de seguir para o próximo.
- Nunca commitar `.env`, chaves, PDFs ou HTMLs de cliente com dados reais. Manter `seed/` e `uploads/` no `.gitignore`, salvo os procedimentos já sanitizados.
- Antes de rodar Postgres na Raspberry, confirmar que o volume está em SSD, não em cartão SD.
