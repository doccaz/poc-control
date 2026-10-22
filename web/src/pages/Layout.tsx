import { NavLink, Outlet } from "react-router-dom";
import { api, User } from "../api";

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
            POC Control
          </NavLink>
          <nav className="navbar-links">
            <NavLink to="/procedimentos" className={navLinkClass}>
              Procedimentos
            </NavLink>
            {user.is_admin && (
              <NavLink to="/usuarios" className={navLinkClass}>
                Usuários
              </NavLink>
            )}
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
        <Outlet />
      </main>
    </div>
  );
}
