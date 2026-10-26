import { FormEvent, useState } from "react";
import { api, User } from "../api";
import { useLanguage } from "../i18n";

export function MinhaConta({
  user,
  onUserAtualizado,
}: {
  user: User;
  onUserAtualizado: (user: User) => void;
}) {
  const { t } = useLanguage();
  const [apiKey, setApiKey] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  const [modelo, setModelo] = useState(user.gemini_model ?? "");
  const [salvandoModelo, setSalvandoModelo] = useState(false);
  const [modeloSalvo, setModeloSalvo] = useState(false);

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
      setErro(t("minhaConta.erroSalvar"));
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

  async function salvarModelo(e: FormEvent) {
    e.preventDefault();
    setSalvandoModelo(true);
    try {
      const atualizado = await api.salvarModeloGemini(modelo.trim());
      onUserAtualizado(atualizado);
      setModeloSalvo(true);
      window.setTimeout(() => setModeloSalvo(false), 3000);
    } finally {
      setSalvandoModelo(false);
    }
  }

  async function removerModelo() {
    setSalvandoModelo(true);
    try {
      const atualizado = await api.removerModeloGemini();
      onUserAtualizado(atualizado);
      setModelo("");
    } finally {
      setSalvandoModelo(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>{t("minhaConta.titulo")}</h1>
      </div>

      <div className="card">
        <h2>{t("minhaConta.chaveGemini")}</h2>
        <p className="field-hint">{t("minhaConta.chaveHint")}</p>

        {user.tem_gemini_key ? (
          <p className="alert alert-success" style={{ marginBottom: 16 }}>
            {t("minhaConta.temChave")}
          </p>
        ) : (
          <p className="alert alert-warning" style={{ marginBottom: 16 }}>
            {t("minhaConta.semChave")}
          </p>
        )}

        <form onSubmit={handleSubmit} className="form">
          <div className="field">
            <label htmlFor="gemini-key">
              {user.tem_gemini_key ? t("minhaConta.substituirChave") : t("minhaConta.cadastrarChave")}
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
              {t("minhaConta.gereSua")}{" "}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
                aistudio.google.com/apikey
              </a>
              . {t("minhaConta.chaveArmazenada")}
            </p>
          </div>
          {erro && <p className="alert alert-error">{erro}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={salvando || !apiKey.trim()}>
              {salvando ? t("common.salvando") : salvo ? t("minhaConta.salva") : t("minhaConta.salvarChave")}
            </button>
            {user.tem_gemini_key && (
              <button type="button" className="btn btn-secondary" onClick={remover} disabled={removendo}>
                {removendo ? t("minhaConta.removendo") : t("minhaConta.removerChave")}
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <h2>{t("minhaConta.modeloGemini")}</h2>
        <p className="field-hint">{t("minhaConta.modeloHint")}</p>

        <form onSubmit={salvarModelo} className="form">
          <div className="field">
            <label htmlFor="gemini-model">{t("minhaConta.modeloLabel")}</label>
            <input
              id="gemini-model"
              type="text"
              className="input"
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              placeholder="gemini-3.8-flash"
              autoComplete="off"
            />
            <p className="field-hint">{t("minhaConta.modeloVazioHint")}</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={salvandoModelo || !modelo.trim()}>
              {salvandoModelo ? t("common.salvando") : modeloSalvo ? t("minhaConta.salva") : t("common.salvar")}
            </button>
            {user.gemini_model && (
              <button type="button" className="btn btn-secondary" onClick={removerModelo} disabled={salvandoModelo}>
                {t("minhaConta.usarDefault")}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
