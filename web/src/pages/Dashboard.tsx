import { Link } from "react-router-dom";
import { User } from "../api";

export function Dashboard({ user }: { user: User }) {
  return (
    <div>
      <div className="page-header">
        <h1>Olá, {user.email.split("@")[0]}</h1>
      </div>
      <p className="muted">Bem-vindo ao POC Control.</p>

      <div className="shortcut-grid">
        <Link to="/pocs" className="shortcut-card">
          <strong>POCs</strong>
          <span>Acompanhe a execução das POCs em andamento.</span>
        </Link>
        <Link to="/procedimentos" className="shortcut-card">
          <strong>Procedimentos</strong>
          <span>Base de conhecimento validada para as POCs.</span>
        </Link>
        {user.is_admin && (
          <Link to="/usuarios" className="shortcut-card">
            <strong>Usuários</strong>
            <span>Gerencie quem tem acesso à ferramenta.</span>
          </Link>
        )}
      </div>
    </div>
  );
}
