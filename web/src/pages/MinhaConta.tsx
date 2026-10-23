import { FormEvent, useState } from "react";
import { api, User } from "../api";

export function MinhaConta({
  user,
  onUserAtualizado,
}: {
  user: User;
  onUserAtualizado: (user: User) => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      const atualizado = await api.salvarChaveGemini(apiKey.trim());
      onUserAtualizado(atualizado);
      setApiKey("");
      setSalvo(true);
      window.setTimeout(() => setSalvo(false), 3000);
    } catch {
      setErro("Não foi possível salvar a chave. Confira se ela foi copiada corretamente.");
    } finally {
      setSalvando(false);
    }
  }

  async function remover() {
    setRemovendo(true);
    try {
      const atualizado = await api.removerChaveGemini();
      onUserAtualizado(atualizado);
    } finally {
      setRemovendo(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Minha conta</h1>
      </div>

      <div className="card">
        <h2>Chave de API do Gemini</h2>
        <p className="field-hint">
          Por padrão, as chamadas de IA usam a chave compartilhada do servidor. Se você cadastrar a sua
          própria chave, o uso (e a cobrança) passa a ser feito na sua conta do Google AI Studio em vez da
          conta compartilhada — o modelo usado continua o mesmo.
        </p>

        {user.tem_gemini_key ? (
          <p className="alert alert-success" style={{ marginBottom: 16 }}>
            Você já tem uma chave pessoal cadastrada.
          </p>
        ) : (
          <p className="alert alert-warning" style={{ marginBottom: 16 }}>
            Você ainda está usando a chave compartilhada do servidor.
          </p>
        )}

        <form onSubmit={handleSubmit} className="form">
          <div className="field">
            <label htmlFor="gemini-key">
              {user.tem_gemini_key ? "Substituir chave" : "Cadastrar chave"}
            </label>
            <input
              id="gemini-key"
              type="password"
              className="input"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza..."
              autoComplete="off"
              minLength={10}
              required
            />
            <p className="field-hint">
              Gere a sua em{" "}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
                aistudio.google.com/apikey
              </a>
              . Ela fica guardada de forma criptografada e nunca é exibida de novo.
            </p>
          </div>
          {erro && <p className="alert alert-error">{erro}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={salvando || !apiKey.trim()}>
              {salvando ? "Salvando..." : salvo ? "Salva!" : "Salvar chave"}
            </button>
            {user.tem_gemini_key && (
              <button type="button" className="btn btn-secondary" onClick={remover} disabled={removendo}>
                {removendo ? "Removendo..." : "Remover chave"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
