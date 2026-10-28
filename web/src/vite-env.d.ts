/// <reference types="vite/client" />

// Injetadas em build-time pelo `define` do vite.config.ts (versão do package.json + timestamp
// do build) -- usadas no rodapé do app (Layout.tsx).
declare const __APP_VERSION__: string;
declare const __APP_BUILD_TIME__: string;
