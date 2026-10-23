import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { api, User } from "./api";
import { Login } from "./pages/Login";
import { Layout } from "./pages/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Procedimentos } from "./pages/Procedimentos";
import { ProcedimentoUpload } from "./pages/ProcedimentoUpload";
import { ProcedimentoView } from "./pages/ProcedimentoView";
import { Usuarios } from "./pages/Usuarios";
import { MinhaConta } from "./pages/MinhaConta";
import { Pocs } from "./pages/Pocs";
import { PocUpload } from "./pages/PocUpload";
import { PocDetail } from "./pages/PocDetail";

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

  return (
    <Routes>
      <Route element={<Layout user={user} onLogout={() => setUser(null)} />}>
        <Route index element={<Dashboard user={user} />} />
        <Route path="procedimentos" element={<Procedimentos />} />
        <Route path="procedimentos/novo" element={<ProcedimentoUpload />} />
        <Route path="procedimentos/:id" element={<ProcedimentoView />} />
        <Route path="pocs" element={<Pocs />} />
        <Route path="pocs/novo" element={<PocUpload />} />
        <Route path="pocs/:id" element={<PocDetail />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="minha-conta" element={<MinhaConta user={user} onUserAtualizado={setUser} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
