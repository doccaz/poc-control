import { useEffect, useRef } from "react";
import { useLanguage } from "@/i18n";
import { mountPlannerEngine } from "../engine/plannerEngine.js";
import "../engine/planner.css";

declare global {
  interface Window {
    P: Record<string, (...args: unknown[]) => unknown>;
  }
}

// O planejador roda no mesmo bundle/documento que o resto do POC Control agora (antes era um
// HTML estático embutido num iframe). A lógica original (wizard de 10 etapas, dimensionamento,
// geração de JSON do EIB, diagrama de arquitetura etc.) foi portada quase sem alterações para
// engine/plannerEngine.js — ela continua sendo um motor imperativo (render-to-string + innerHTML,
// com um objeto global `window.P` para os handlers), e não uma árvore de componentes React por
// etapa. Reescrever isso em componentes idiomáticos é um projeto futuro maior (ver README,
// seção Roadmap); o que mudou agora é que deixou de ser um documento HTML separado: compila no
// mesmo build, compartilha o tema visual (engine/planner.css, escopado em #planner-root) e recebe
// o idioma direto do seletor único do app, sem iframe nem postMessage.
export function PlanPoc() {
  const { lang } = useLanguage();
  const appRef = useRef<HTMLDivElement>(null);
  const montado = useRef(false);

  useEffect(() => {
    if (montado.current) return;
    montado.current = true;
    mountPlannerEngine(lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!montado.current) return;
    window.P?.setLang?.(lang);
  }, [lang]);

  return (
    <div id="planner-root">
      <div id="app" ref={appRef} />
    </div>
  );
}
