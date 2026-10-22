import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export function PocUpload() {
  const navigate = useNavigate();
  const [titulo, setTitulo] = useState("");
  const [cliente, setCliente] = useState("");
  const [escopo, setEscopo] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!arquivo) {
      setErro("Selecione o PDF da POC");
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      const form = new FormData();
      form.append("titulo", titulo);
      form.append("cliente", cliente);
      form.append("escopo", escopo);
      form.append("arquivo", arquivo);
      const criado = await api.criarPoc(form);
      navigate(`/pocs/${criado.id}`);
    } catch {
      setErro("Não foi possível criar a POC");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Nova POC</h1>
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
              placeholder="PoC SUSE Virtualization"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="cliente">Cliente</label>
            <input
              id="cliente"
              className="input"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="escopo">Escopo (opcional)</label>
            <input
              id="escopo"
              className="input"
              value={escopo}
              onChange={(e) => setEscopo(e.target.value)}
              placeholder="Ex.: escopo de storage limitado ao CSI do fabricante"
            />
          </div>
          <div className="field">
            <label htmlFor="arquivo">PDF da POC</label>
            <input
              id="arquivo"
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              required
            />
            <p className="field-hint">
              O Gemini lê o PDF e extrai o plano de testes (fases, itens e pré-requisitos) em segundo plano.
            </p>
          </div>
          {erro && <p className="alert alert-error">{erro}</p>}
          <button type="submit" className="btn btn-primary" disabled={enviando}>
            {enviando ? "Enviando..." : "Criar POC"}
          </button>
        </form>
      </div>
    </div>
  );
}
