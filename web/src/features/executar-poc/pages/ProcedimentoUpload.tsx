import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";

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
      <div className="page-header">
        <h1>Novo procedimento</h1>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="form">
          <div className="field">
            <label htmlFor="titulo">Título</label>
            <input
              id="titulo"
              className="input"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="tags">Tags</label>
            <input
              id="tags"
              className="input"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="k3s, Argo CD, OpenShift"
            />
            <p className="field-hint">Separadas por vírgula.</p>
          </div>
          <div className="field">
            <label htmlFor="cliente">Cliente de origem</label>
            <input
              id="cliente"
              className="input"
              value={clienteOrigem}
              onChange={(e) => setClienteOrigem(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="rascunho">Rascunho</option>
              <option value="validado">Validado</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="arquivo">Arquivo HTML</label>
            <input
              id="arquivo"
              type="file"
              accept=".html,text/html"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              required
            />
          </div>
          {erro && <p className="alert alert-error">{erro}</p>}
          <button type="submit" className="btn btn-primary" disabled={enviando}>
            {enviando ? "Enviando..." : "Salvar"}
          </button>
        </form>
      </div>
    </div>
  );
}
