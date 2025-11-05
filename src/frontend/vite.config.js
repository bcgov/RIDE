import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import devtoolsJson from "vite-plugin-devtools-json";

export default defineConfig({
  envDir: "../../",
  plugins: [
    react(),
    tailwindcss(),
    devtoolsJson(),
  ],
  base: "/",
  build: {
    outDir: "build/client",
  },
});