import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { api, User } from "../api";
import suseLogo from "../assets/suse-logo.svg";
import { useLanguage } from "../i18n";
import { Sidebar } from "./Sidebar";

type Theme = "light" | "dark";

// Mesma chave que o motor do Planejar PoC já usa internamente (engine/plannerEngine.js,
// THEME_KEY) -- os dois lados ficam em sincronia sem precisar se avisar: o motor aplica o
// atributo data-theme na <html> uma vez, no carregamento do script (antes do React montar);
// este botão só continua escrevendo na mesma chave/atributo depois disso.
const THEME_KEY = "suse_poc_planner_theme";

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // localStorage indisponível (modo privado etc.) -- cai no fallback de sistema
  }
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

function formatBuildInfo(lang: string): string {
  const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US";
  const formatada = new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(
    new Date(__APP_BUILD_TIME__),
  );
  return `v${__APP_VERSION__} · ${formatada}`;
}

export function Layout({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(readStoredTheme);
  const location = useLocation();
  const { lang, setLang, t } = useLanguage();

  const isHome = location.pathname === "/";

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // localStorage indisponível -- a preferência só não persiste entre sessões
    }
  }, [theme]);

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
        <button
          className="theme-toggle"
          onClick={() => setTheme((cur) => (cur === "dark" ? "light" : "dark"))}
          aria-label={theme === "dark" ? t("theme.toLight") : t("theme.toDark")}
          title={theme === "dark" ? t("theme.toLight") : t("theme.toDark")}
        >
          {theme === "dark" ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
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

      <span className="build-info" title={__APP_BUILD_TIME__}>
        {formatBuildInfo(lang)}
      </span>
    </div>
  );
}
