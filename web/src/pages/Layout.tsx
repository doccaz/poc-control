import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { api, User } from "../api";
import suseLogo from "../assets/suse-logo.svg";
import { useLanguage } from "../i18n";
import { Sidebar } from "./Sidebar";

export function Layout({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { lang, setLang, t } = useLanguage();

  const isHome = location.pathname === "/";

  async function handleLogout() {
    await api.logout();
    onLogout();
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="hamburger" aria-label="Abrir menu" onClick={() => setSidebarOpen(true)}>
          <span />
          <span />
          <span />
        </button>
        <Link to="/" className="topbar-brand">
          <img src={suseLogo} alt="" className="navbar-logo" />
          {t("brand")}
        </Link>
        <div className="lang-switch">
          <button className={lang === "pt" ? "lang-btn active" : "lang-btn"} onClick={() => setLang("pt")}>
            PT
          </button>
          <button className={lang === "en" ? "lang-btn active" : "lang-btn"} onClick={() => setLang("en")}>
            EN
          </button>
          <button className={lang === "es" ? "lang-btn active" : "lang-btn"} onClick={() => setLang("es")}>
            ES
          </button>
        </div>
      </header>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} onLogout={handleLogout} />

      <main className={isHome ? "page page-flush" : "page"}>
        {!isHome && !user.tem_gemini_key && (
          <p className="alert alert-warning" style={{ marginBottom: 20 }}>
            Você está usando a chave de API do Gemini compartilhada do servidor. Cadastre a sua própria
            chave em <Link to="/minha-conta">Minha conta</Link> para que o uso seja faturado na sua conta.
          </p>
        )}
        <Outlet />
      </main>
    </div>
  );
}
