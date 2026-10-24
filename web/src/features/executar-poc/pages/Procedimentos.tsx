import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ProcedimentoListItem } from "@/api";

export function Procedimentos() {
  const [itens, setItens] = useState<ProcedimentoListItem[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .listarProcedimentos()
      .then(setItens)
      .catch(() => setErro("Não foi possível carregar os procedimentos"));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Procedimentos</h1>
        <Link to="/procedimentos/novo" className="btn btn-primary">
          Novo procedimento
        </Link>
      </div>

      {erro && <p className="alert alert-error">{erro}</p>}
      {itens === null && !erro && <p className="muted">Carregando...</p>}

      {itens && itens.length === 0 && (
        <div className="card empty-state">Nenhum procedimento cadastrado ainda.</div>
      )}

      {itens && itens.length > 0 && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Tags</th>
                  <th>Cliente</th>
                  <th>Status</th>
                  <th>Versão</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link to={`/procedimentos/${p.id}`}>{p.titulo}</Link>
                    </td>
                    <td className="muted">{p.tags.join(", ") || "—"}</td>
                    <td>{p.cliente_origem ?? "—"}</td>
                    <td>
                      <span className={`badge badge-${p.status}`}>{p.status}</span>
                    </td>
                    <td>{p.versao}</td>
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
