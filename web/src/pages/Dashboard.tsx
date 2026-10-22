import { api, User } from "../api";

export function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  async function handleLogout() {
    await api.logout();
    onLogout();
  }

  return (
    <div style={{ maxWidth: 480, margin: "10vh auto", fontFamily: "sans-serif" }}>
      <h1>POC Control</h1>
      <p>Olá, {user.email}. Em construção.</p>
      <button onClick={handleLogout}>Sair</button>
    </div>
  );
}
