import { FormEvent, useState } from "react";
import { api, User } from "../api";

export function Login({ onLogin }: { onLogin: (user: User) => void }) {
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
      setError("E-mail ou senha inválidos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 320, margin: "10vh auto", fontFamily: "sans-serif" }}>
      <h1>POC Control</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ display: "block", width: "100%" }}
            />
          </label>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>
            Senha
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ display: "block", width: "100%" }}
            />
          </label>
        </div>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
