import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("embla-carousel")) {
              return "carousel";
            }

            if (id.includes("framer-motion")) {
              return "animations";
            }

            if (id.includes("lucide-react")) {
              return "icons";
            }

            if (id.includes("@radix-ui") || id.includes("sonner")) {
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

          if (id.includes("/src/components/BlogSection")) {
            return "section-blog";
          }

          if (id.includes("/src/components/TestimonialsCarousel")) {
            return "section-testimonials";
          }
        },
      },
    },
  },
}));
