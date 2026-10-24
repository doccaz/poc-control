import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, PocListItem } from "@/api";

const STATUS_LABEL: Record<string, string> = {
  ativa: "Ativa",
  concluida: "Concluída",
  suspensa: "Suspensa",
};

function pct(poc: PocListItem) {
  if (poc.total_itens === 0) return 0;
  return Math.round((poc.itens_concluidos / poc.total_itens) * 100);
}

export function Pocs() {
  const [itens, setItens] = useState<PocListItem[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .listarPocs()
      .then(setItens)
      .catch(() => setErro("Não foi possível carregar as POCs"));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>POCs</h1>
        <Link to="/pocs/novo" className="btn btn-primary">
          Nova POC
        </Link>
      </div>

      {erro && <p className="alert alert-error">{erro}</p>}
      {itens === null && !erro && <p className="muted">Carregando...</p>}

      {itens && itens.length === 0 && <div className="card empty-state">Nenhuma POC cadastrada ainda.</div>}

      {itens && itens.length > 0 && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Cliente</th>
                  <th>Status</th>
                  <th>Extração</th>
                  <th>Progresso</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link to={`/pocs/${p.id}`}>{p.titulo}</Link>
                    </td>
                    <td>{p.cliente}</td>
                    <td>
                      <span className="badge badge-muted">{STATUS_LABEL[p.status] ?? p.status}</span>
                    </td>
                    <td>
                      {p.status_extracao === "extraindo" && <span className="badge badge-info">extraindo...</span>}
                      {p.status_extracao === "erro" && <span className="badge badge-vermelho">erro</span>}
                      {p.status_extracao === "pronto" && <span className="muted">—</span>}
                    </td>
                    <td className="muted">
                      {p.total_itens > 0 ? `${pct(p)}% (${p.itens_concluidos}/${p.total_itens})` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
