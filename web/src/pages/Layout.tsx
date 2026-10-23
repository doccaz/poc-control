import { NavLink, Outlet } from "react-router-dom";
import { api, User } from "../api";
import suseLogo from "../assets/suse-logo.svg";

function navLinkClass({ isActive }: { isActive: boolean }) {
  return isActive ? "navbar-link active" : "navbar-link";
}

export function Layout({ user, onLogout }: { user: User; onLogout: () => void }) {
  async function handleLogout() {
    await api.logout();
    onLogout();
  }

  return (
    <div className="app-shell">
      <header className="navbar">
        <div className="navbar-inner">
          <NavLink to="/" className="navbar-brand">
            <img src={suseLogo} alt="" className="navbar-logo" />
            POC Control
          </NavLink>
          <nav className="navbar-links">
            <NavLink to="/pocs" className={navLinkClass}>
              POCs
            </NavLink>
            <NavLink to="/procedimentos" className={navLinkClass}>
              Procedimentos
            </NavLink>
            {user.is_admin && (
              <NavLink to="/usuarios" className={navLinkClass}>
                Usuários
              </NavLink>
            )}
            <NavLink to="/minha-conta" className={navLinkClass}>
              Minha conta
            </NavLink>
          </nav>
          <div className="navbar-user">
            <span>{user.email}</span>
            <button className="btn btn-secondary" onClick={handleLogout}>
              Sair
            </button>
          </div>
        </div>
      </header>
      <main className="page">
        {!user.tem_gemini_key && (
          <p className="alert alert-warning" style={{ marginBottom: 20 }}>
            Você está usando a chave de API do Gemini compartilhada do servidor. Cadastre a sua própria
            chave em <NavLink to="/minha-conta">Minha conta</NavLink> para que o uso seja faturado na sua
            conta.
          </p>
        )}
        <Outlet />
      </main>
    </div>
  );
}
