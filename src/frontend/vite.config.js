import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import devtoolsJson from 'vite-plugin-devtools-json';
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  envDir: '../../',
  plugins: [
    reactRouter(),
    tailwindcss(),
    devtoolsJson(),
    svgr(),
  ],
  server: {
    allowedHosts: ['localhost', '.apps.gold.devops.gov.bc.ca', '.th.gov.bc.ca', 'dev-ride.th.gov.bc.ca'],
  },
  optimizeDeps: { exclude: ['node_modules/.cache'] }
});