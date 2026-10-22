import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export function ProcedimentoUpload() {
  const navigate = useNavigate();
  const [titulo, setTitulo] = useState("");
  const [tags, setTags] = useState("");
  const [clienteOrigem, setClienteOrigem] = useState("");
  const [status, setStatus] = useState("rascunho");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!arquivo) {
      setErro("Selecione um arquivo HTML");
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      const form = new FormData();
      form.append("titulo", titulo);
      form.append("tags", tags);
      form.append("cliente_origem", clienteOrigem);
      form.append("status", status);
      form.append("arquivo", arquivo);
      const criado = await api.criarProcedimento(form);
      navigate(`/procedimentos/${criado.id}`);
    } catch {
      setErro("Não foi possível salvar o procedimento");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <h1>Novo procedimento</h1>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 480 }}
      >
        <label>
          Título
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
            style={{ display: "block", width: "100%" }}
          />
        </label>
        <label>
          Tags (separadas por vírgula)
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            style={{ display: "block", width: "100%" }}
          />
        </label>
        <label>
          Cliente de origem
          <input
            value={clienteOrigem}
            onChange={(e) => setClienteOrigem(e.target.value)}
            style={{ display: "block", width: "100%" }}
          />
        </label>
        <label>
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ display: "block", width: "100%" }}
          >
            <option value="rascunho">Rascunho</option>
            <option value="validado">Validado</option>
          </select>
        </label>
        <label>
          Arquivo HTML
          <input
            type="file"
            accept=".html,text/html"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
            required
            style={{ display: "block" }}
          />
        </label>
        {erro && <p style={{ color: "red" }}>{erro}</p>}
        <button type="submit" disabled={enviando}>
          {enviando ? "Enviando..." : "Salvar"}
        </button>
      </form>
    </div>
  );
}
