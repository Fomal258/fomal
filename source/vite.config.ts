import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

// 로컬(VS Code) 실행용 Vite 설정입니다.
// 원본에 있던 Manus 로그인/서버 프록시 플러그인은 제거하고, 프론트엔드만 빌드합니다.
export default defineConfig({
  // 파일을 더블클릭해도 열리도록 상대 경로로 빌드
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@assets": path.resolve(import.meta.dirname, "client", "public"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    // 파일 더블클릭(file://)에서도 실행되도록 단일 IIFE 번들
    rollupOptions: {
      output: {
        format: "iife",
        inlineDynamicImports: true,
        entryFileNames: "assets/app.js",
        assetFileNames: "assets/app.[ext]",
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    open: false,
  },
});
