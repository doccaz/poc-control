import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api, CondicaoItem, Fase, ItemPoc, PocDetail as PocDetailData, StatusItem } from "../api";

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
  const pollRef = useRef<number | null>(null);

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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function handleItemAtualizado(atualizado: ItemPoc) {
    setPoc((atual) => (atual ? { ...atual, itens: atual.itens.map((i) => (i.id === atualizado.id ? atualizado : i)) } : atual));
  }

  function handleItemRemovido(itemId: string) {
    setPoc((atual) => (atual ? { ...atual, itens: atual.itens.filter((i) => i.id !== itemId) } : atual));
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

      {tab === "andamento" && (
        <div className="card empty-state">
          Sessões, registro de decisões e próximos passos chegam no próximo marco.
        </div>
      )}
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

function ItemRow({
  pocId,
  item,
  onAtualizado,
  onRemovido,
}: {
  pocId: string;
  item: ItemPoc;
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
        </div>
      )}
    </div>
  );
}
