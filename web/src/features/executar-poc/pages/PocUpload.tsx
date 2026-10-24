import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";

type Modo = "arquivo" | "texto";

export function PocUpload() {
  const navigate = useNavigate();
  const [titulo, setTitulo] = useState("");
  const [cliente, setCliente] = useState("");
  const [escopo, setEscopo] = useState("");
  const [modo, setModo] = useState<Modo>("arquivo");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (modo === "arquivo" && !arquivo) {
      setErro("Selecione o PDF, ou o JSON/texto do plano de testes");
      return;
    }
    if (modo === "texto" && !texto.trim()) {
      setErro("Cole o plano de testes (texto ou JSON)");
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      const form = new FormData();
      form.append("titulo", titulo);
      form.append("cliente", cliente);
      form.append("escopo", escopo);
      if (modo === "arquivo" && arquivo) form.append("arquivo", arquivo);
      if (modo === "texto") form.append("texto", texto);
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
            <label>Plano de testes</label>
            <div className="field-toggle">
              <button
                type="button"
                className={modo === "arquivo" ? "field-toggle-btn active" : "field-toggle-btn"}
                onClick={() => setModo("arquivo")}
              >
                Arquivo
              </button>
              <button
                type="button"
                className={modo === "texto" ? "field-toggle-btn active" : "field-toggle-btn"}
                onClick={() => setModo("texto")}
              >
                Colar texto
              </button>
            </div>

            {modo === "arquivo" ? (
              <>
                <input
                  id="arquivo"
                  type="file"
                  accept=".pdf,.json,.txt,.md,application/pdf,application/json,text/plain,text/markdown"
                  onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
                />
                <p className="field-hint">
                  PDF da POC, ou o JSON exportado em <strong>Planejar PoC → Resumo → Exportar Projeto</strong>{" "}
                  (ou um .txt/.md com o plano de testes). O Gemini extrai o plano de testes (fases, itens e
                  pré-requisitos) em segundo plano.
                </p>
              </>
            ) : (
              <>
                <textarea
                  id="texto"
                  className="input"
                  rows={10}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Cole aqui o plano de testes em texto, ou o JSON exportado em Planejar PoC → Resumo → Exportar Projeto"
                />
                <p className="field-hint">
                  Cole o texto do plano de testes do cliente, ou o conteúdo do JSON exportado em{" "}
                  <strong>Planejar PoC → Resumo → Exportar Projeto</strong>. O Gemini reconhece os dois formatos.
                </p>
              </>
            )}
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
