import js from "@eslint/js";
import globals from "globals";
import eslintReact from "@eslint-react/eslint-plugin";
import { defineConfig } from "eslint/config";


export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    plugins: { js },
    extends: ["js/recommended"]
  },
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    languageOptions: {
      globals: globals.browser
    }
  },
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    extends: [eslintReact.configs.recommended]
  },
  {
    rules: {
      'no-unused-vars': 'warn',
    }
  }
]);
