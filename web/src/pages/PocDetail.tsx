import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  api,
  CondicaoItem,
  Fase,
  FlagClassificacao,
  ItemPoc,
  PocDetail as PocDetailData,
  ProcedimentoListItem,
  Sessao,
  StatusItem,
} from "../api";

const STATUS_LABEL: Record<StatusItem, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  bloqueado: "Bloqueado",
  nao_aplicavel: "N/A",
};

const CONDUCAO_LABEL: Record<CondicaoItem, string> = {
  suse: "SUSE",
  cliente: "Cliente",
  lateral: "Lateral",
};

const FLAG_LABEL: Record<FlagClassificacao, string> = {
  verde: "Verde — é só seguir",
  amarelo: "Amarelo",
  vermelho: "Vermelho",
};

const TABS = [
  { id: "plano", label: "Plano de testes" },
  { id: "pre", label: "Pré-requisitos" },
  { id: "resumo", label: "Resumo e riscos" },
  { id: "andamento", label: "Andamento" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function pct(total: number, concluidos: number) {
  if (total === 0) return 0;
  return Math.round((concluidos / total) * 100);
}

function faseTitulo(fases: Fase[], numero: number) {
  return fases.find((f) => f.numero === numero)?.titulo ?? `Fase ${numero}`;
}

function faseDescricao(fases: Fase[], numero: number) {
  return fases.find((f) => f.numero === numero)?.descricao ?? "";
}

export function PocDetail() {
  const { id } = useParams<{ id: string }>();
  const [poc, setPoc] = useState<PocDetailData | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("plano");
  const [procedimentos, setProcedimentos] = useState<ProcedimentoListItem[]>([]);
  const [classificandoLote, setClassificandoLote] = useState(false);
  const pollRef = useRef<number | null>(null);
  const pollLoteRef = useRef<number | null>(null);

  useEffect(() => {
    api.listarProcedimentos().then(setProcedimentos).catch(() => {});
  }, []);

  function carregar() {
    if (!id) return;
    api
      .obterPoc(id)
      .then((data) => {
        setPoc(data);
        if (data.status_extracao === "extraindo") {
          pollRef.current = window.setTimeout(carregar, 3000);
        }
      })
      .catch(() => setErro("Não foi possível carregar a POC"));
  }

  useEffect(() => {
    carregar();
    return () => {
      if (pollRef.current) window.clearTimeout(pollRef.current);
      if (pollLoteRef.current) window.clearTimeout(pollLoteRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function handleItemAtualizado(atualizado: ItemPoc) {
    setPoc((atual) => (atual ? { ...atual, itens: atual.itens.map((i) => (i.id === atualizado.id ? atualizado : i)) } : atual));
  }

  async function classificarPendentes() {
    if (!id) return;
    setClassificandoLote(true);
    await api.classificarPendentes(id);

    function poll() {
      api.obterPoc(id!).then((data) => {
        setPoc(data);
        const faltam = data.itens.some((i) => !i.classificacao);
        if (faltam) {
          pollLoteRef.current = window.setTimeout(poll, 4000);
        } else {
          setClassificandoLote(false);
        }
      });
    }
    pollLoteRef.current = window.setTimeout(poll, 4000);
  }

  function handleItemRemovido(itemId: string) {
    setPoc((atual) => (atual ? { ...atual, itens: atual.itens.filter((i) => i.id !== itemId) } : atual));
  }

  function handleSessaoCriada(sessao: Sessao) {
    setPoc((atual) => (atual ? { ...atual, sessoes: [...atual.sessoes, sessao] } : atual));
  }

  function handlePrereqAtualizado(prereq: { id: string; atendido: boolean }) {
    setPoc((atual) =>
      atual
        ? {
            ...atual,
            prerequisitos: atual.prerequisitos.map((p) => (p.id === prereq.id ? { ...p, atendido: prereq.atendido } : p)),
          }
        : atual
    );
  }

  if (erro) return <p className="alert alert-error">{erro}</p>;
  if (!poc) return <p className="muted">Carregando...</p>;

  const totalConcluido = poc.itens.filter((i) => i.status === "concluido").length;
  const porFase = new Map<number, ItemPoc[]>();
  for (const item of poc.itens) {
    const lista = porFase.get(item.fase) ?? [];
    lista.push(item);
    porFase.set(item.fase, lista);
  }
  const numerosFase = [...porFase.keys()].sort((a, b) => a - b);

  return (
    <div>
      <div className="poc-header">
        <div className="poc-header-top">
          <div>
            <h1>{poc.titulo}</h1>
            <div className="poc-sub">
              {poc.cliente} · {poc.itens.length} itens
            </div>
          </div>
          <div className="poc-pct">
            <b>{pct(poc.itens.length, totalConcluido)}%</b>
            <span>itens concluídos</span>
          </div>
        </div>

        <a
          href={api.urlExportarPoc(poc.id)}
          target="_blank"
          rel="noreferrer"
          className="btn btn-secondary"
          style={{ display: "inline-block", marginTop: 12 }}
        >
          Exportar status (HTML)
        </a>

        {numerosFase.length > 0 && (
          <div className="phase-strip">
            {numerosFase.map((n) => {
              const itensFase = porFase.get(n)!;
              const total = itensFase.length;
              const segs: { cor: string; pct: number }[] = [
                { cor: "var(--color-success)", pct: itensFase.filter((i) => i.status === "concluido").length },
                { cor: "var(--color-info)", pct: itensFase.filter((i) => i.status === "em_andamento").length },
                { cor: "var(--color-danger)", pct: itensFase.filter((i) => i.status === "bloqueado").length },
                {
                  cor: "rgba(255,255,255,.35)",
                  pct: itensFase.filter((i) => i.status === "pendente" || i.status === "nao_aplicavel").length,
                },
              ];
              return (
                <div className="phase-seg" key={n} title={faseTitulo(poc.fases, n)}>
                  <div className="bar">
                    {segs.map((s, i) =>
                      s.pct > 0 ? (
                        <i key={i} style={{ width: `${(s.pct / total) * 100}%`, background: s.cor }} />
                      ) : null
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {poc.status_extracao === "extraindo" && (
        <p className="alert alert-success">Extraindo itens do PDF com o Gemini... atualiza automaticamente.</p>
      )}
      {poc.status_extracao === "erro" && (
        <p className="alert alert-error">Falha na extração: {poc.erro_extracao ?? "erro desconhecido"}</p>
      )}

      <div className="poc-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? "poc-tab active" : "poc-tab"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "plano" && (
        <div className="card">
          {poc.itens.length > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
              <button className="btn btn-secondary" onClick={classificarPendentes} disabled={classificandoLote}>
                {classificandoLote ? "Classificando..." : "Classificar itens sem semáforo"}
              </button>
            </div>
          )}
          {poc.itens.length === 0 && <div className="empty-state">Nenhum item extraído ainda.</div>}
          {numerosFase.map((n) => (
            <div key={n}>
              <div className="fase-header">
                <span className="n">{n}</span>
                <h3>{faseTitulo(poc.fases, n)}</h3>
                {faseDescricao(poc.fases, n) && <p>{faseDescricao(poc.fases, n)}</p>}
              </div>
              {porFase
                .get(n)!
                .map((item) => (
                  <ItemRow
                    key={item.id}
                    pocId={poc.id}
                    item={item}
                    procedimentos={procedimentos}
                    sessoes={poc.sessoes}
                    clientePoc={poc.cliente}
                    onAtualizado={handleItemAtualizado}
                    onRemovido={handleItemRemovido}
                  />
                ))}
            </div>
          ))}
        </div>
      )}

      {tab === "pre" && (
        <div className="card">
          {poc.prerequisitos.length === 0 && (
            <div className="empty-state">Nenhum pré-requisito identificado no documento.</div>
          )}
          {poc.prerequisitos.map((p) => (
            <div key={p.id} className="item-row" style={{ padding: "10px 0" }}>
              <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={p.atendido}
                  style={{ marginTop: 3 }}
                  onChange={(e) =>
                    api
                      .atualizarPrerequisito(poc.id, p.id, e.target.checked)
                      .then(handlePrereqAtualizado)
                  }
                />
                <span>
                  <strong style={{ textDecoration: p.atendido ? "line-through" : undefined }}>{p.titulo}</strong>
                  {p.descricao && <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{p.descricao}</div>}
                </span>
              </label>
            </div>
          ))}
        </div>
      )}

      {tab === "resumo" && <ResumoTab poc={poc} porFase={porFase} numerosFase={numerosFase} />}

      {tab === "andamento" && <AndamentoTab poc={poc} onSessaoCriada={handleSessaoCriada} />}
    </div>
  );
}

function ResumoTab({
  poc,
  porFase,
  numerosFase,
}: {
  poc: PocDetailData;
  porFase: Map<number, ItemPoc[]>;
  numerosFase: number[];
}) {
  const contagem: Record<StatusItem, number> = {
    pendente: 0,
    em_andamento: 0,
    concluido: 0,
    bloqueado: 0,
    nao_aplicavel: 0,
  };
  for (const item of poc.itens) contagem[item.status]++;
  const bloqueados = poc.itens.filter((i) => i.status === "bloqueado");

  return (
    <div>
      <div className="shortcut-grid" style={{ marginTop: 0, marginBottom: 20 }}>
        {(Object.keys(STATUS_LABEL) as StatusItem[]).map((s) => (
          <div className="card" key={s} style={{ padding: 16 }}>
            <div className="muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.03em" }}>
              {STATUS_LABEL[s]}
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>{contagem[s]}</div>
          </div>
        ))}
      </div>

      <h2>Status por fase</h2>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Fase</th>
                <th>Itens</th>
                <th>Concluído</th>
                <th>Bloqueado</th>
                <th>Pendente</th>
              </tr>
            </thead>
            <tbody>
              {numerosFase.map((n) => {
                const itensFase = porFase.get(n)!;
                return (
                  <tr key={n}>
                    <td>{faseTitulo(poc.fases, n)}</td>
                    <td>{itensFase.length}</td>
                    <td>{itensFase.filter((i) => i.status === "concluido").length}</td>
                    <td>{itensFase.filter((i) => i.status === "bloqueado").length}</td>
                    <td>{itensFase.filter((i) => i.status === "pendente").length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <h2>Itens bloqueados</h2>
      <div className="card">
        {bloqueados.length === 0 && <div className="empty-state">Nenhum item bloqueado.</div>}
        {bloqueados.length > 0 && (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {bloqueados.map((i) => (
              <li key={i.id} style={{ marginBottom: 10 }}>
                <strong>{i.codigo}</strong> {i.titulo}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

type EntradaTimeline =
  | { tipo: "status"; created_at: string; codigo: string; anterior: StatusItem | null; novo: StatusItem }
  | { tipo: "nota"; created_at: string; codigo: string; texto: string };

function AndamentoTab({ poc, onSessaoCriada }: { poc: PocDetailData; onSessaoCriada: (s: Sessao) => void }) {
  const [data, setData] = useState("");
  const [participantes, setParticipantes] = useState("");
  const [agenda, setAgenda] = useState("");
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [textoImportar, setTextoImportar] = useState("");
  const [importando, setImportando] = useState(false);
  const [erroImportar, setErroImportar] = useState<string | null>(null);

  const promptSugerido = `Resuma a sessão de hoje da PoC ${poc.cliente}: o que foi discutido e testado, o que foi resolvido, o que ficou com falha ou pendência, e quais são os próximos passos. Pode responder em texto corrido.`;

  async function copiarPrompt() {
    try {
      await navigator.clipboard.writeText(promptSugerido);
    } catch {
      // clipboard pode não estar disponível (ex.: contexto não seguro); segue sem copiar
    }
  }

  async function importarResumo() {
    if (!textoImportar.trim()) return;
    setErroImportar(null);
    setImportando(true);
    try {
      const sessao = await api.importarSessao(poc.id, textoImportar.trim());
      onSessaoCriada(sessao);
      setTextoImportar("");
    } catch {
      setErroImportar("Não foi possível importar o resumo");
    } finally {
      setImportando(false);
    }
  }

  async function criarSessao() {
    if (!data) {
      setErro("Informe a data da sessão");
      return;
    }
    setErro(null);
    setCriando(true);
    try {
      const sessao = await api.criarSessao(poc.id, {
        data,
        participantes: participantes
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean),
        agenda: agenda || null,
      });
      onSessaoCriada(sessao);
      setData("");
      setParticipantes("");
      setAgenda("");
    } catch {
      setErro("Não foi possível criar a sessão");
    } finally {
      setCriando(false);
    }
  }

  const porSessao = new Map<string | null, EntradaTimeline[]>();
  function registrar(sessaoId: string | null, entrada: EntradaTimeline) {
    const lista = porSessao.get(sessaoId) ?? [];
    lista.push(entrada);
    porSessao.set(sessaoId, lista);
  }
  for (const item of poc.itens) {
    for (const h of item.status_historico) {
      registrar(h.sessao_id, {
        tipo: "status",
        created_at: h.created_at,
        codigo: item.codigo,
        anterior: h.status_anterior,
        novo: h.status_novo,
      });
    }
    for (const n of item.notas) {
      registrar(n.sessao_id, { tipo: "nota", created_at: n.created_at, codigo: item.codigo, texto: n.texto });
    }
  }

  function renderEntrada(e: EntradaTimeline, i: number) {
    return (
      <li key={i} style={{ marginBottom: 4, fontSize: 13 }}>
        <strong>{e.codigo}</strong>{" "}
        {e.tipo === "status" ? (
          <>
            mudou de {e.anterior ? STATUS_LABEL[e.anterior] : "—"} para {STATUS_LABEL[e.novo]}
          </>
        ) : (
          <>nota: {e.texto}</>
        )}
      </li>
    );
  }

  const sessoesOrdenadas = [...poc.sessoes].sort((a, b) => (a.data < b.data ? 1 : -1));
  const semSessao = porSessao.get(null) ?? [];

  return (
    <div>
      <h2>Sessões</h2>

      <div className="card" style={{ marginBottom: 20 }}>
        <strong>Importar resumo da sessão</strong>
        <p className="field-hint">
          Cole o prompt sugerido na ferramenta de IA que você usa durante a sessão com o cliente, cole o
          resumo que ela devolver no campo abaixo, e o Gemini organiza automaticamente em pontos resolvidos,
          pontos com falha e próximos passos.
        </p>
        <div className="field">
          <label>Prompt sugerido</label>
          <textarea
            className="input"
            rows={2}
            readOnly
            value={promptSugerido}
            onClick={(e) => e.currentTarget.select()}
          />
          <button className="btn btn-secondary" onClick={copiarPrompt} type="button" style={{ marginTop: 6 }}>
            Copiar prompt
          </button>
        </div>
        <div className="field">
          <label>Resumo da sessão</label>
          <textarea
            className="input"
            rows={6}
            value={textoImportar}
            onChange={(e) => setTextoImportar(e.target.value)}
            placeholder="Cole aqui o resumo gerado pela sua ferramenta de IA..."
          />
        </div>
        {erroImportar && <p className="alert alert-error">{erroImportar}</p>}
        <button
          className="btn btn-primary"
          onClick={importarResumo}
          disabled={importando || !textoImportar.trim()}
          type="button"
        >
          {importando ? "Gemini organizando o resumo..." : "Importar"}
        </button>
        {importando && (
          <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
            Isso pode levar alguns segundos...
          </p>
        )}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <strong>Ou crie uma sessão manualmente</strong>
        <div
          className="fields"
          style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}
        >
          <div className="field">
            <label>Data</label>
            <input type="date" className="input" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="field">
            <label>Participantes</label>
            <input
              className="input"
              value={participantes}
              onChange={(e) => setParticipantes(e.target.value)}
              placeholder="Separados por vírgula"
            />
          </div>
        </div>
        <div className="field">
          <label>Agenda</label>
          <textarea className="input" rows={2} value={agenda} onChange={(e) => setAgenda(e.target.value)} />
        </div>
        {erro && <p className="alert alert-error">{erro}</p>}
        <button className="btn btn-primary" onClick={criarSessao} disabled={criando} type="button">
          {criando ? "Criando..." : "Nova sessão"}
        </button>
      </div>

      {sessoesOrdenadas.length === 0 && <div className="card empty-state">Nenhuma sessão registrada ainda.</div>}

      {sessoesOrdenadas.map((s) => {
        const entradas = (porSessao.get(s.id) ?? []).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
        return (
          <SessaoCard key={s.id} pocId={poc.id} sessao={s} entradas={entradas} renderEntrada={renderEntrada} />
        );
      })}

      {semSessao.length > 0 && (
        <div className="card">
          <strong>Sem sessão vinculada</strong>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>{semSessao.map(renderEntrada)}</ul>
        </div>
      )}
    </div>
  );
}

function SessaoCard({
  pocId,
  sessao: s,
  entradas,
  renderEntrada,
}: {
  pocId: string;
  sessao: Sessao;
  entradas: EntradaTimeline[];
  renderEntrada: (e: EntradaTimeline, i: number) => JSX.Element;
}) {
  const [gerando, setGerando] = useState(false);
  const [resumoEmail, setResumoEmail] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function gerarResumo() {
    setGerando(true);
    setResumoEmail(null);
    try {
      const { texto } = await api.gerarResumoSessao(pocId, s.id);
      setResumoEmail(texto);
    } finally {
      setGerando(false);
    }
  }

  async function copiarResumo() {
    if (!resumoEmail) return;
    try {
      await navigator.clipboard.writeText(resumoEmail);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      // clipboard pode não estar disponível; segue sem copiar
    }
  }

  const temResumoImportado = s.pontos_resolvidos.length > 0 || s.pontos_falha.length > 0 || s.proximos_passos.length > 0;

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <strong>{new Date(s.data).toLocaleDateString("pt-BR")}</strong>
          {s.participantes.length > 0 && (
            <span className="muted" style={{ marginLeft: 8 }}>
              {s.participantes.join(", ")}
            </span>
          )}
        </div>
        <button className="btn btn-secondary" onClick={gerarResumo} disabled={gerando} type="button">
          {gerando ? "Gemini escrevendo..." : "Gerar resumo para e-mail"}
        </button>
      </div>

      {s.agenda && (
        <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
          {s.agenda}
        </p>
      )}

      {temResumoImportado && (
        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {s.pontos_resolvidos.length > 0 && (
            <div>
              <span className="badge badge-verde">Resolvido</span>
              <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                {s.pontos_resolvidos.map((p, i) => (
                  <li key={i} style={{ fontSize: 13 }}>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {s.pontos_falha.length > 0 && (
            <div>
              <span className="badge badge-vermelho">Falha / pendência</span>
              <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                {s.pontos_falha.map((p, i) => (
                  <li key={i} style={{ fontSize: 13 }}>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {s.proximos_passos.length > 0 && (
            <div>
              <span className="badge badge-info">Próximos passos</span>
              <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                {s.proximos_passos.map((p, i) => (
                  <li key={i} style={{ fontSize: 13 }}>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {entradas.length === 0 ? (
        !temResumoImportado && (
          <p className="empty-state" style={{ marginTop: 8 }}>
            Nenhum registro nesta sessão ainda.
          </p>
        )
      ) : (
        <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>{entradas.map(renderEntrada)}</ul>
      )}

      {(gerando || resumoEmail !== null) && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--color-border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <strong>Resumo para e-mail</strong>
            {resumoEmail && (
              <button className="btn btn-secondary" onClick={copiarResumo} type="button">
                {copiado ? "Copiado!" : "Copiar"}
              </button>
            )}
          </div>
          {gerando ? (
            <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
              Isso pode levar alguns segundos...
            </p>
          ) : (
            <textarea className="input" rows={8} readOnly value={resumoEmail ?? ""} style={{ marginTop: 8 }} />
          )}
        </div>
      )}
    </div>
  );
}

function ItemRow({
  pocId,
  item,
  procedimentos,
  sessoes,
  clientePoc,
  onAtualizado,
  onRemovido,
}: {
  pocId: string;
  item: ItemPoc;
  procedimentos: ProcedimentoListItem[];
  sessoes: Sessao[];
  clientePoc: string;
  onAtualizado: (item: ItemPoc) => void;
  onRemovido: (itemId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState(item.titulo);
  const [descricao, setDescricao] = useState(item.descricao ?? "");
  const [criterio, setCriterio] = useState(item.criterio_aceite ?? "");
  const [categoria, setCategoria] = useState(item.categoria ?? "");
  const [fase, setFase] = useState(item.fase);
  const [conducao, setConducao] = useState<CondicaoItem | "">(item.conducao ?? "");
  const [salvando, setSalvando] = useState(false);
  const [reavaliando, setReavaliando] = useState(false);
  const [editandoManual, setEditandoManual] = useState(false);
  const [flagManual, setFlagManual] = useState<FlagClassificacao>(item.classificacao?.flag ?? "amarelo");
  const [procedimentoManual, setProcedimentoManual] = useState(item.classificacao?.procedimento_id ?? "");
  const [justificativaManual, setJustificativaManual] = useState(item.classificacao?.justificativa ?? "");
  const [salvandoManual, setSalvandoManual] = useState(false);

  const [sessaoNotaId, setSessaoNotaId] = useState("");
  const [textoNota, setTextoNota] = useState("");
  const [salvandoNota, setSalvandoNota] = useState(false);

  const [sessaoAnexoId, setSessaoAnexoId] = useState("");
  const [arquivoAnexo, setArquivoAnexo] = useState<File | null>(null);
  const [enviandoAnexo, setEnviandoAnexo] = useState(false);

  const [promovendo, setPromovendo] = useState(false);
  const [tituloProc, setTituloProc] = useState(item.titulo);
  const [tagsProc, setTagsProc] = useState(item.categoria ?? "");
  const [textoProc, setTextoProc] = useState("");
  const [salvandoProc, setSalvandoProc] = useState(false);
  const [procSalvo, setProcSalvo] = useState(false);

  async function adicionarNota() {
    if (!sessaoNotaId || !textoNota.trim()) return;
    setSalvandoNota(true);
    try {
      const atualizado = await api.criarNota(pocId, item.id, sessaoNotaId, textoNota.trim());
      onAtualizado(atualizado);
      setTextoNota("");
    } finally {
      setSalvandoNota(false);
    }
  }

  async function excluirNota(notaId: string) {
    const atualizado = await api.removerNota(pocId, item.id, notaId);
    onAtualizado(atualizado);
  }

  async function enviarAnexo() {
    if (!arquivoAnexo) return;
    setEnviandoAnexo(true);
    try {
      const form = new FormData();
      form.append("arquivo", arquivoAnexo);
      if (sessaoAnexoId) form.append("sessao_id", sessaoAnexoId);
      const atualizado = await api.criarAnexo(pocId, item.id, form);
      onAtualizado(atualizado);
      setArquivoAnexo(null);
    } finally {
      setEnviandoAnexo(false);
    }
  }

  async function excluirAnexo(anexoId: string) {
    const atualizado = await api.removerAnexo(pocId, item.id, anexoId);
    onAtualizado(atualizado);
  }

  async function promoverProcedimento() {
    if (!tituloProc.trim() || !textoProc.trim()) return;
    setSalvandoProc(true);
    try {
      const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const paragrafos = textoProc
        .split(/\n{2,}/)
        .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
        .join("\n");
      const html = `<h2>${escapeHtml(tituloProc)}</h2>\n${paragrafos}`;

      const form = new FormData();
      form.append("titulo", tituloProc);
      form.append("tags", tagsProc);
      form.append("cliente_origem", clientePoc);
      form.append("status", "validado");
      form.append("arquivo", new Blob([html], { type: "text/html" }), `${tituloProc}.html`);
      await api.criarProcedimento(form);
      setProcSalvo(true);
      setPromovendo(false);
    } finally {
      setSalvandoProc(false);
    }
  }

  async function reavaliar() {
    setReavaliando(true);
    try {
      const atualizado = await api.classificarItem(pocId, item.id);
      onAtualizado(atualizado);
      setFlagManual(atualizado.classificacao?.flag ?? "amarelo");
      setProcedimentoManual(atualizado.classificacao?.procedimento_id ?? "");
      setJustificativaManual(atualizado.classificacao?.justificativa ?? "");
    } finally {
      setReavaliando(false);
    }
  }

  async function salvarClassificacaoManual() {
    setSalvandoManual(true);
    try {
      const atualizado = await api.sobrescreverClassificacao(pocId, item.id, {
        flag: flagManual,
        procedimento_id: flagManual === "verde" ? procedimentoManual || null : null,
        justificativa: justificativaManual || null,
      });
      onAtualizado(atualizado);
      setEditandoManual(false);
    } finally {
      setSalvandoManual(false);
    }
  }

  const procedimentoVinculado = item.classificacao?.procedimento_id
    ? procedimentos.find((p) => p.id === item.classificacao!.procedimento_id)
    : undefined;
  const validados = procedimentos.filter((p) => p.status === "validado");

  async function salvar() {
    setSalvando(true);
    try {
      const atualizado = await api.atualizarItem(pocId, item.id, {
        titulo,
        descricao,
        criterio_aceite: criterio,
        categoria,
        fase,
        conducao: conducao || null,
      });
      onAtualizado(atualizado);
    } finally {
      setSalvando(false);
    }
  }

  async function mudarStatus(status: StatusItem) {
    const atualizado = await api.atualizarItem(pocId, item.id, { status });
    onAtualizado(atualizado);
  }

  async function remover() {
    await api.removerItem(pocId, item.id);
    onRemovido(item.id);
  }

  return (
    <div className={open ? "item-row open" : "item-row"}>
      <div className="item-row-head" onClick={() => setOpen(!open)}>
        <span className="item-codigo">{item.codigo}</span>
        <span className="item-titulo">
          {item.titulo}
          {item.categoria && <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>{item.categoria}</span>}
        </span>
        {item.conducao && <span className={`chip chip-${item.conducao}`}>{CONDUCAO_LABEL[item.conducao]}</span>}
        <span className={`badge badge-${item.classificacao?.flag ?? "muted"}`}>
          {item.classificacao ? FLAG_LABEL[item.classificacao.flag] : "Sem semáforo"}
        </span>
        <span className={`badge badge-${item.status}`}>{STATUS_LABEL[item.status]}</span>
        <select
          className="input"
          value={item.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => mudarStatus(e.target.value as StatusItem)}
        >
          {(Object.keys(STATUS_LABEL) as StatusItem[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {open && (
        <div className="item-row-body">
          <div className="field">
            <label>Título</label>
            <input className="input" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div className="field">
            <label>Descrição</label>
            <textarea className="input" rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div className="field">
            <label>Critério de aceite</label>
            <textarea className="input" rows={2} value={criterio} onChange={(e) => setCriterio(e.target.value)} />
          </div>
          <div className="fields" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
            <div className="field">
              <label>Categoria</label>
              <input className="input" value={categoria} onChange={(e) => setCategoria(e.target.value)} />
            </div>
            <div className="field">
              <label>Fase</label>
              <input
                type="number"
                min={1}
                className="input"
                value={fase}
                onChange={(e) => setFase(Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>Condução</label>
              <select className="input" value={conducao} onChange={(e) => setConducao(e.target.value as CondicaoItem | "")}>
                <option value="">—</option>
                <option value="suse">SUSE</option>
                <option value="cliente">Cliente</option>
                <option value="lateral">Lateral</option>
              </select>
            </div>
          </div>
          {item.ref && <p className="field-hint">Referência no documento original: {item.ref}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </button>
            <button className="btn btn-secondary" onClick={remover} type="button">
              Remover item
            </button>
          </div>

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--color-border)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <strong>Classificação</strong>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-secondary" onClick={reavaliar} disabled={reavaliando} type="button">
                  {reavaliando ? "Reavaliando..." : "Reavaliar"}
                </button>
                <button className="btn btn-secondary" onClick={() => setEditandoManual((v) => !v)} type="button">
                  {editandoManual ? "Cancelar" : "Sobrescrever"}
                </button>
              </div>
            </div>

            {item.classificacao ? (
              <div className="muted" style={{ fontSize: 13 }}>
                <div>
                  <span className={`badge badge-${item.classificacao.flag}`}>
                    {FLAG_LABEL[item.classificacao.flag]}
                  </span>{" "}
                  <span>({item.classificacao.origem === "manual" ? "ajustado manualmente" : "automático"})</span>
                </div>
                {item.classificacao.justificativa && <p style={{ marginTop: 6 }}>{item.classificacao.justificativa}</p>}
                {procedimentoVinculado && (
                  <p>
                    Procedimento:{" "}
                    <Link to={`/procedimentos/${procedimentoVinculado.id}`}>{procedimentoVinculado.titulo}</Link>
                  </p>
                )}
                {item.classificacao.fontes.length > 0 && (
                  <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                    {item.classificacao.fontes.map((f, i) => (
                      <li key={i}>
                        <a href={f.url} target="_blank" rel="noreferrer">
                          {f.titulo}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <p className="empty-state">Ainda não classificado. Use "Reavaliar" para rodar a classificação.</p>
            )}

            {editandoManual && (
              <div className="fields" style={{ marginTop: 12, display: "grid", gap: 10 }}>
                <div className="field">
                  <label>Semáforo</label>
                  <select
                    className="input"
                    value={flagManual}
                    onChange={(e) => setFlagManual(e.target.value as FlagClassificacao)}
                  >
                    <option value="verde">Verde</option>
                    <option value="amarelo">Amarelo</option>
                    <option value="vermelho">Vermelho</option>
                  </select>
                </div>
                {flagManual === "verde" && (
                  <div className="field">
                    <label>Procedimento vinculado</label>
                    <select
                      className="input"
                      value={procedimentoManual}
                      onChange={(e) => setProcedimentoManual(e.target.value)}
                    >
                      <option value="">—</option>
                      {validados.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.titulo}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="field">
                  <label>Justificativa</label>
                  <textarea
                    className="input"
                    rows={2}
                    value={justificativaManual}
                    onChange={(e) => setJustificativaManual(e.target.value)}
                  />
                </div>
                <div>
                  <button
                    className="btn btn-primary"
                    onClick={salvarClassificacaoManual}
                    disabled={salvandoManual}
                    type="button"
                  >
                    {salvandoManual ? "Salvando..." : "Salvar classificação manual"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--color-border)" }}>
            <strong>Notas</strong>
            {item.notas.length === 0 ? (
              <p className="empty-state" style={{ marginTop: 8 }}>
                Nenhuma nota ainda.
              </p>
            ) : (
              <ul style={{ margin: "8px 0", paddingLeft: 18 }}>
                {item.notas.map((n) => (
                  <li key={n.id} style={{ marginBottom: 6, fontSize: 13 }}>
                    {n.texto}{" "}
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: 11, padding: "1px 6px" }}
                      onClick={() => excluirNota(n.id)}
                      type="button"
                    >
                      remover
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {sessoes.length === 0 ? (
              <p className="field-hint">Crie uma sessão na aba "Andamento" pra poder adicionar notas.</p>
            ) : (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
                <select
                  className="input"
                  style={{ maxWidth: 160 }}
                  value={sessaoNotaId}
                  onChange={(e) => setSessaoNotaId(e.target.value)}
                >
                  <option value="">Sessão...</option>
                  {sessoes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {new Date(s.data).toLocaleDateString("pt-BR")}
                    </option>
                  ))}
                </select>
                <textarea
                  className="input"
                  rows={1}
                  style={{ flex: 1, minWidth: 160 }}
                  value={textoNota}
                  onChange={(e) => setTextoNota(e.target.value)}
                  placeholder="Nova nota..."
                />
                <button
                  className="btn btn-secondary"
                  onClick={adicionarNota}
                  disabled={salvandoNota || !sessaoNotaId || !textoNota.trim()}
                  type="button"
                >
                  Adicionar
                </button>
              </div>
            )}
          </div>

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--color-border)" }}>
            <strong>Anexos</strong>
            {item.anexos.length === 0 ? (
              <p className="empty-state" style={{ marginTop: 8 }}>
                Nenhum anexo ainda.
              </p>
            ) : (
              <ul style={{ margin: "8px 0", paddingLeft: 18 }}>
                {item.anexos.map((a) => (
                  <li key={a.id} style={{ marginBottom: 6, fontSize: 13 }}>
                    <a href={api.urlAnexo(pocId, item.id, a.id)} target="_blank" rel="noreferrer">
                      {a.nome_arquivo}
                    </a>{" "}
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: 11, padding: "1px 6px" }}
                      onClick={() => excluirAnexo(a.id)}
                      type="button"
                    >
                      remover
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {sessoes.length > 0 && (
                <select
                  className="input"
                  style={{ maxWidth: 160 }}
                  value={sessaoAnexoId}
                  onChange={(e) => setSessaoAnexoId(e.target.value)}
                >
                  <option value="">Sem sessão</option>
                  {sessoes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {new Date(s.data).toLocaleDateString("pt-BR")}
                    </option>
                  ))}
                </select>
              )}
              <input type="file" onChange={(e) => setArquivoAnexo(e.target.files?.[0] ?? null)} />
              <button
                className="btn btn-secondary"
                onClick={enviarAnexo}
                disabled={enviandoAnexo || !arquivoAnexo}
                type="button"
              >
                {enviandoAnexo ? "Enviando..." : "Enviar anexo"}
              </button>
            </div>
          </div>

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--color-border)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <strong>Procedimento</strong>
              <button className="btn btn-secondary" onClick={() => setPromovendo((v) => !v)} type="button">
                {promovendo ? "Cancelar" : "Promover a procedimento validado"}
              </button>
            </div>
            {procSalvo && (
              <p className="alert alert-success" style={{ marginTop: 8 }}>
                Procedimento salvo na base como validado.
              </p>
            )}
            {promovendo && (
              <div className="fields" style={{ marginTop: 12, display: "grid", gap: 10 }}>
                <div className="field">
                  <label>Título do procedimento</label>
                  <input className="input" value={tituloProc} onChange={(e) => setTituloProc(e.target.value)} />
                </div>
                <div className="field">
                  <label>Tags</label>
                  <input
                    className="input"
                    value={tagsProc}
                    onChange={(e) => setTagsProc(e.target.value)}
                    placeholder="k3s, Rancher..."
                  />
                </div>
                <div className="field">
                  <label>Passo a passo que funcionou</label>
                  <textarea className="input" rows={6} value={textoProc} onChange={(e) => setTextoProc(e.target.value)} />
                </div>
                <div>
                  <button
                    className="btn btn-primary"
                    onClick={promoverProcedimento}
                    disabled={salvandoProc || !textoProc.trim()}
                    type="button"
                  >
                    {salvandoProc ? "Salvando..." : "Salvar procedimento"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
