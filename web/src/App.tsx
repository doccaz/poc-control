import { useEffect, useState } from "react";
import { api, User } from "./api";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  if (checking) return null;

  if (!user) return <Login onLogin={setUser} />;

  return <Dashboard user={user} onLogout={() => setUser(null)} />;
}
