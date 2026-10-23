import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // só afeta `npm run dev`; o build de produção (Docker/nginx) nem lê isso.
    // Aponta pra API real (Raspberry Pi) em vez de rodar a stack inteira local.
    // Em outra máquina/IP, defina POC_CONTROL_DEV_API antes de `npm run dev`.
    proxy: {
      "/api": process.env.POC_CONTROL_DEV_API || "http://192.168.1.24:8091",
    },
  },
});
