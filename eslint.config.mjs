import globals from "globals"
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from "eslint-config-prettier/flat"
import typescriptEslint from "@typescript-eslint/eslint-plugin"
import esLintParser from "@typescript-eslint/parser"

export default tseslint.config({
  languageOptions: {
    ecmaVersion: 12,
    sourceType: "module",
    globals: {
      ...globals.browser,
      ...globals.node,
      myCustomGlobal: "readonly",
    },
    parser: esLintParser,
  },
  plugins: {
    typescriptEslint,
  },
  extends: [js.configs.recommended, ...tseslint.configs.recommended, eslintConfigPrettier],
  rules: {...eslintConfigPrettier.rules},
  files: ["src/**/*.ts", "src/*.ts", "tests/**/*.ts"],
  ignores: ["node_modules/**", ".idea/**"]
})