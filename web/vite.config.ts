import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.resolve(__dirname, "package.json"), "utf-8"));

export default defineConfig({
  plugins: [react()],
  define: {
    // Rodapé do app (Layout.tsx) mostra isto pra dar pra confirmar visualmente se um deploy
    // pegou -- calculado agora, no momento do `vite build` (dentro do container, no build da
    // imagem), não em runtime no navegador.
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  resolve: {
    alias: {
      // Alias estável p/ imports entre features (web/src/features/*) sem depender da
      // profundidade relativa de cada pasta — cada time move seus arquivos sem quebrar o resto.
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    // só afeta `npm run dev`; o build de produção (Docker/nginx) nem lê isso.
    // Aponta pra API real (Raspberry Pi) em vez de rodar a stack inteira local.
    // Em outra máquina/IP, defina POC_CONTROL_DEV_API antes de `npm run dev`.
    proxy: {
      "/api": process.env.POC_CONTROL_DEV_API || "http://192.168.1.24:8091",
    },
  },
});
