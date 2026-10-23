import { createContext, ReactNode, useContext, useEffect, useState } from "react";

export type Lang = "pt" | "en";

const LANG_STORAGE_KEY = "poc-control-lang";

// Escopo intencional: só a "casca" do app (navbar, menu, dashboard). O conteúdo gerado pelo
// Gemini e os formulários de domínio continuam em pt-BR — traduzi-los é um projeto separado.
const DICT: Record<Lang, Record<string, string>> = {
  pt: {
    brand: "SUSE POC PLANNER",
    "mode.run": "Executar PoC",
    "mode.plan": "Planejar PoC",
    "nav.dashboard": "Dashboard",
    "nav.pocs": "POCs",
    "nav.procedimentos": "Procedimentos",
    "nav.usuarios": "Usuários",
    "nav.minhaConta": "Minha conta",
    "action.sair": "Sair",
    "dashboard.greeting": "Olá",
    "dashboard.welcome": "Bem-vindo ao POC Control.",
    "dashboard.pocs.title": "POCs",
    "dashboard.pocs.desc": "Acompanhe a execução das POCs em andamento.",
    "dashboard.procedimentos.title": "Procedimentos",
    "dashboard.procedimentos.desc": "Base de conhecimento validada para as POCs.",
    "plan.loading": "Carregando o planejador de PoC...",
  },
  en: {
    brand: "SUSE POC PLANNER",
    "mode.run": "Run a PoC",
    "mode.plan": "Plan a PoC",
    "nav.dashboard": "Dashboard",
    "nav.pocs": "PoCs",
    "nav.procedimentos": "Procedures",
    "nav.usuarios": "Users",
    "nav.minhaConta": "My account",
    "action.sair": "Log out",
    "dashboard.greeting": "Hello",
    "dashboard.welcome": "Welcome to POC Control.",
    "dashboard.pocs.title": "PoCs",
    "dashboard.pocs.desc": "Track the execution of ongoing PoCs.",
    "dashboard.procedimentos.title": "Procedures",
    "dashboard.procedimentos.desc": "Validated knowledge base for PoCs.",
    "plan.loading": "Loading the PoC planner...",
  },
};

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    return stored === "en" ? "en" : "pt";
  } catch {
    return "pt";
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStoredLang);

  useEffect(() => {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // localStorage pode não estar disponível; a preferência só não persiste entre sessões
    }
  }, [lang]);

  function setLang(next: Lang) {
    setLangState(next);
  }

  function t(key: string): string {
    return DICT[lang][key] ?? DICT.pt[key] ?? key;
  }

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage deve ser usado dentro de LanguageProvider");
  return ctx;
}
