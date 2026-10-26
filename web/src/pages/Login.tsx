import { FormEvent, useState } from "react";
import { api, User } from "../api";
import { useLanguage } from "../i18n";

export function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await api.login(email, password);
      onLogin(user);
    } catch {
      setError(t("login.erro"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <h1>{t("login.titulo")}</h1>
        <form onSubmit={handleSubmit} className="form">
          <div className="field">
            <label htmlFor="login-email">{t("login.email")}</label>
            <input
              id="login-email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="field">
            <label htmlFor="login-password">{t("login.senha")}</label>
            <input
              id="login-password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="alert alert-error">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? t("login.entrando") : t("login.entrar")}
          </button>
        </form>
      </div>
    </div>
  );
}
