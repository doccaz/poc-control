import { FormEvent, useEffect, useState } from "react";
import { api, ApiError, UsuarioListItem } from "../api";

export function Usuarios() {
  const [itens, setItens] = useState<UsuarioListItem[] | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function carregar() {
    api
      .listarUsuarios()
      .then(setItens)
      .catch(() => setErroLista("Não foi possível carregar os usuários"));
  }

  useEffect(carregar, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErroForm(null);
    setEnviando(true);
    try {
      await api.criarUsuario(email, password, isAdmin);
      setEmail("");
      setPassword("");
      setIsAdmin(false);
      carregar();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setErroForm("Já existe um usuário com esse e-mail");
      } else {
        setErroForm("Não foi possível criar o usuário");
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Usuários</h1>
      </div>

      {erroLista && <p className="alert alert-error">{erroLista}</p>}
      {itens === null && !erroLista && <p className="muted">Carregando...</p>}

      {itens && itens.length > 0 && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>E-mail</th>
                  <th>Perfil</th>
                  <th>Criado em</th>
                  <th>Último login</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((u) => (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>
                      {u.is_admin ? (
                        <span className="badge badge-admin">admin</span>
                      ) : (
                        <span className="badge badge-muted">usuário</span>
                      )}
                    </td>
                    <td className="muted">{new Date(u.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="muted">
                      {u.ultimo_login
                        ? new Date(u.ultimo_login).toLocaleString("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })
                        : "Nunca"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <h2>Novo usuário</h2>
        <form onSubmit={handleSubmit} className="form">
          <div className="field">
            <label htmlFor="novo-email">E-mail</label>
            <input
              id="novo-email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="novo-password">Senha inicial</label>
            <input
              id="novo-password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            <p className="field-hint">Mínimo de 8 caracteres. Combine com a pessoa depois.</p>
          </div>
          <div className="checkbox-field">
            <input
              id="novo-admin"
              type="checkbox"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
            />
            <label htmlFor="novo-admin">Tornar administrador</label>
          </div>
          {erroForm && <p className="alert alert-error">{erroForm}</p>}
          <button type="submit" className="btn btn-primary" disabled={enviando}>
            {enviando ? "Criando..." : "Criar usuário"}
          </button>
        </form>
      </div>
    </div>
  );
}
