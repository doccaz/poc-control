import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ProcedimentoListItem } from "../api";

const th: CSSProperties = { textAlign: "left", borderBottom: "1px solid #ccc", padding: 8 };
const td: CSSProperties = { borderBottom: "1px solid #eee", padding: 8 };

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Procedimentos</h1>
        <Link to="/procedimentos/novo">Novo procedimento</Link>
      </div>
      {erro && <p style={{ color: "red" }}>{erro}</p>}
      {itens === null && !erro && <p>Carregando...</p>}
      {itens && itens.length === 0 && <p>Nenhum procedimento cadastrado.</p>}
      {itens && itens.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Título</th>
              <th style={th}>Tags</th>
              <th style={th}>Cliente</th>
              <th style={th}>Status</th>
              <th style={th}>Versão</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((p) => (
              <tr key={p.id}>
                <td style={td}>
                  <Link to={`/procedimentos/${p.id}`}>{p.titulo}</Link>
                </td>
                <td style={td}>{p.tags.join(", ")}</td>
                <td style={td}>{p.cliente_origem ?? "—"}</td>
                <td style={td}>{p.status}</td>
                <td style={td}>{p.versao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
