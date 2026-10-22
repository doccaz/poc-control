import { Link } from "react-router-dom";
import { User } from "../api";

export function Dashboard({ user }: { user: User }) {
  return (
    <div>
      <p>Olá, {user.email}.</p>
      <p>
        <Link to="/procedimentos">Ver procedimentos</Link>
      </p>
    </div>
  );
}
