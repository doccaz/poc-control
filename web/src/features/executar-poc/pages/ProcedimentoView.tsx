import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, ProcedimentoDetail } from "@/api";

export function ProcedimentoView() {
  const { id } = useParams<{ id: string }>();
  const [procedimento, setProcedimento] = useState<ProcedimentoDetail | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .obterProcedimento(id)
      .then(setProcedimento)
      .catch(() => setErro("Não foi possível carregar o procedimento"));
  }, [id]);

  if (erro) return <p className="alert alert-error">{erro}</p>;
  if (!procedimento) return <p className="muted">Carregando...</p>;

  return (
    <div>
      <div className="page-header">
        <h1>{procedimento.titulo}</h1>
        <span className={`badge badge-${procedimento.status}`}>{procedimento.status}</span>
      </div>

      <div className="card">
        <p>
          <strong>Cliente:</strong> {procedimento.cliente_origem ?? "—"} &nbsp;·&nbsp;{" "}
          <strong>Versão:</strong> {procedimento.versao}
        </p>
        <p>
          <strong>Tags:</strong> {procedimento.tags.join(", ") || "—"}
        </p>
      </div>

      <div className="card">
        <h2>Seções indexadas</h2>
        <ul className="secoes-list">
          {procedimento.secoes.map((s, i) => (
            <li key={i} className={s.heading_level === 3 ? "sub" : undefined}>
              {s.heading_title}
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2>Conteúdo original</h2>
        <iframe
          title={procedimento.titulo}
          sandbox="allow-same-origin"
          srcDoc={procedimento.html_original}
          className="html-frame"
        />
      </div>
    </div>
  );
}
