import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: true,           // allow external access
    port: 8080,
    strictPort: true,     // optional, ensures Vite doesn’t change port
    allowedHosts: [
      "8dc9211ff2be.ngrok-free.app",
      ".ngrok-free.app",  // wildcard for subdomains
    ],
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
