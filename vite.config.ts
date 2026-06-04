import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  base: "./",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("lucide-react")) {
              return "icons";
            }

            if (id.includes("@radix-ui")) {
              return "ui-vendor";
            }

            if (id.includes("react") || id.includes("react-router-dom")) {
              return "vendor";
            }

            return "vendor-misc";
          }

          if (id.includes("/src/pages/")) {
            const pageName = path.basename(id).replace(/\.[cm]?[jt]sx?$/, "");
            return `page-${pageName}`;
          }

        },
      },
    },
  },
}));
