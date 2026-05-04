import eslintJs from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tseslintParser from "@typescript-eslint/parser";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";

const languageOptions = {
  parser: tseslintParser,
  parserOptions: {
    project: "./tsconfig.json",
    ecmaVersion: "latest",
    sourceType: "module",
  },
  globals: {
    ...globals.node,
  },
};

export default [
  eslintJs.configs.recommended,
  // Domain — cannot import from any other internal layer
  {
    files: ["src/core/domain/**/*.ts"],
    languageOptions,
    plugins: { "@typescript-eslint": tseslint },
    rules: {
      ...tseslint.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/core/application/**", "@/adapters/**", "@/config/**"],
              message: "Domain layer cannot import from application, adapters, or config.",
            },
          ],
        },
      ],
    },
  },
  // Application — can only import from domain (logger singleton is an allowed exception)
  {
    files: ["src/core/application/**/*.ts"],
    languageOptions,
    plugins: { "@typescript-eslint": tseslint },
    rules: {
      ...tseslint.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/adapters/**"],
              message: "Application layer cannot import from adapters.",
            },
            {
              group: ["@/config/!(logger)"],
              message: "Application layer cannot import from config (except @/config/logger).",
            },
          ],
        },
      ],
    },
  },
  // Adapters and config — TypeScript rules only
  {
    files: ["src/adapters/**/*.ts", "src/config/**/*.ts"],
    languageOptions,
    plugins: { "@typescript-eslint": tseslint },
    rules: {
      ...tseslint.configs.recommended.rules,
    },
  },
  // Entry points and utilities — composition roots, unrestricted
  {
    files: ["src/main.ts", "scripts/**/*.ts", "tests/**/*.ts"],
    languageOptions,
    plugins: { "@typescript-eslint": tseslint },
    rules: {
      ...tseslint.configs.recommended.rules,
    },
  },
  prettierConfig,
  {
    ignores: ["node_modules/", "dist/", "drizzle/", ".git/"],
  },
];
