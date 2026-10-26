import { FormEvent, useEffect, useState } from "react";
import { api, ApiError, UsuarioListItem } from "../api";
import { useLanguage } from "../i18n";

export function Usuarios() {
  const { t } = useLanguage();
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
      .catch(() => setErroLista(t("usuarios.erroCarregar")));
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
        setErroForm(t("usuarios.erroEmailExistente"));
      } else {
        setErroForm(t("usuarios.erroCriar"));
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>{t("usuarios.titulo")}</h1>
      </div>

      {erroLista && <p className="alert alert-error">{erroLista}</p>}
      {itens === null && !erroLista && <p className="muted">{t("common.carregando")}</p>}

      {itens && itens.length > 0 && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("usuarios.colEmail")}</th>
                  <th>{t("usuarios.colPerfil")}</th>
                  <th>{t("usuarios.colCriadoEm")}</th>
                  <th>{t("usuarios.colUltimoLogin")}</th>
                  <th>{t("usuarios.colChaveGemini")}</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((u) => (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>
                      {u.is_admin ? (
                        <span className="badge badge-admin">{t("usuarios.admin")}</span>
                      ) : (
                        <span className="badge badge-muted">{t("usuarios.usuario")}</span>
                      )}
                    </td>
                    <td className="muted">{new Date(u.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="muted">
                      {u.ultimo_login
                        ? new Date(u.ultimo_login).toLocaleString("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })
                        : t("common.nunca")}
                    </td>
                    <td>
                      {u.tem_gemini_key ? (
                        <span className="badge badge-verde">{t("common.sim")}</span>
                      ) : (
                        <span className="badge badge-muted">{t("common.nao")}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <h2>{t("usuarios.novoUsuario")}</h2>
        <form onSubmit={handleSubmit} className="form">
          <div className="field">
            <label htmlFor="novo-email">{t("usuarios.colEmail")}</label>
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
            <label htmlFor="novo-password">{t("usuarios.senhaInicial")}</label>
            <input
              id="novo-password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            <p className="field-hint">{t("usuarios.senhaHint")}</p>
          </div>
          <div className="checkbox-field">
            <input
              id="novo-admin"
              type="checkbox"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
            />
            <label htmlFor="novo-admin">{t("usuarios.tornarAdmin")}</label>
          </div>
          {erroForm && <p className="alert alert-error">{erroForm}</p>}
          <button type="submit" className="btn btn-primary" disabled={enviando}>
            {enviando ? t("common.criando") : t("usuarios.criarUsuario")}
          </button>
        </form>
      </div>
    </div>
  );
}
