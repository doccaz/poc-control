import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, ProcedimentoDetail } from "../api";

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

  if (erro) return <p style={{ color: "red" }}>{erro}</p>;
  if (!procedimento) return <p>Carregando...</p>;

  return (
    <div>
      <h1>{procedimento.titulo}</h1>
      <p>
        <strong>Cliente:</strong> {procedimento.cliente_origem ?? "—"} · <strong>Status:</strong>{" "}
        {procedimento.status} · <strong>Versão:</strong> {procedimento.versao}
      </p>
      <p>
        <strong>Tags:</strong> {procedimento.tags.join(", ") || "—"}
      </p>

      <h2>Seções indexadas</h2>
      <ul>
        {procedimento.secoes.map((s, i) => (
          <li key={i} style={{ marginLeft: s.heading_level === 3 ? 16 : 0 }}>
            {s.heading_title}
          </li>
        ))}
      </ul>

      <h2>Conteúdo original</h2>
      <iframe
        title={procedimento.titulo}
        sandbox="allow-same-origin"
        srcDoc={procedimento.html_original}
        style={{ width: "100%", height: "70vh", border: "1px solid #ccc" }}
      />
    </div>
  );
}
