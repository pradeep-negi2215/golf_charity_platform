import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2018",
    sourcemap: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (id.includes("react-router-dom")) {
            return "router";
          }

          if (id.includes("react-dom") || id.includes("react")) {
            return "react-vendor";
          }

          if (id.includes("axios")) {
            return "http";
          }

          return "vendor";
        }
      }
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
    globals: true
  }
});
