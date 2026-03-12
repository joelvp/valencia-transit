import eslintJs from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tseslintParser from "@typescript-eslint/parser";
import hexagonalArchitecture from "eslint-plugin-hexagonal-architecture";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";

export default [
  eslintJs.configs.recommended,
  // Hexagonal Architecture — enforce on core layers (domain + application)
  // The plugin hardcodes a folder check for /application|domain|infrastructure/,
  // so it only works on src/core/ where paths naturally contain "domain" or "application".
  // This enforces the critical invariant: domain never imports from infrastructure.
  {
    files: ["src/core/**/*.ts"],
    languageOptions: {
      parser: tseslintParser,
      parserOptions: {
        project: "./tsconfig.json",
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      "hexagonal-architecture": hexagonalArchitecture,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      "hexagonal-architecture/enforce": [
        "error",
        {
          layers: {
            domain: "src/core/domain/**",
            application: "src/core/application/**",
            adapters: "src/adapters/**",
            config: "src/config/**",
          },
          rules: [
            {
              from: "domain",
              allow: [],
            },
            {
              from: "application",
              allow: ["domain"],
            },
          ],
        },
      ],
    },
  },
  // Adapters and config — TypeScript rules only, no hexagonal folder enforcement
  {
    files: ["src/adapters/**/*.ts", "src/config/**/*.ts"],
    languageOptions: {
      parser: tseslintParser,
      parserOptions: {
        project: "./tsconfig.json",
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
    },
  },
  // Entry points and utilities - Outside hexagonal architecture
  // These are composition roots that orchestrate all layers
  {
    files: ["src/main.ts", "scripts/**/*.ts", "tests/**/*.ts"],
    languageOptions: {
      parser: tseslintParser,
      parserOptions: {
        project: "./tsconfig.json",
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      // Note: No hexagonal architecture enforcement here
      // These files are allowed to import from any layer
    },
  },
  prettierConfig,
  {
    ignores: ["node_modules/", "dist/", "drizzle/", ".git/"],
  },
];
