import { useEffect, useRef } from "react";
import { useLanguage } from "@/i18n";

export function PlanPoc() {
  const { lang } = useLanguage();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // O seletor de idioma é único para o site inteiro (ver i18n.tsx); o planejador roda num
  // HTML estático à parte (sem modificação da lógica dele), então repassamos o idioma por
  // postMessage em vez de duplicar o seletor de idioma dentro do iframe.
  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: "poc-control:set-lang", lang }, "*");
  }, [lang]);

  return (
    <iframe
      ref={iframeRef}
      src={`/planejar-poc/plan-poc.html?lang=${lang}`}
      title="Planejador de PoC"
      style={{ display: "block", width: "100%", height: "100%", border: "none" }}
      onLoad={() => iframeRef.current?.contentWindow?.postMessage({ type: "poc-control:set-lang", lang }, "*")}
    />
  );
}
