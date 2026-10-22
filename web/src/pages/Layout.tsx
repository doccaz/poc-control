import { Link, Outlet } from "react-router-dom";
import { api, User } from "../api";

export function Layout({ user, onLogout }: { user: User; onLogout: () => void }) {
  async function handleLogout() {
    await api.logout();
    onLogout();
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24, fontFamily: "sans-serif" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <nav style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Link to="/" style={{ fontWeight: "bold", textDecoration: "none" }}>
            POC Control
          </Link>
          <Link to="/procedimentos">Procedimentos</Link>
        </nav>
        <div>
          <span style={{ marginRight: 12 }}>{user.email}</span>
          <button onClick={handleLogout}>Sair</button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
