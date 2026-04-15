import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  base: "/pibconfins/",
  server: {
    host: "::",
    port: 8081,
  },
  preview: {
    port: 3000,
    host: true,
    allowedHosts: ["amiticia.cc", "www.amiticia.cc", "localhost"],
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
