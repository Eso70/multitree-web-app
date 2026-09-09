import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Build-support scripts use Node.js module conventions intentionally.
    "scripts/**",
  ]),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: [
      "src/components/business/**/*.{ts,tsx}",
      "src/features/business/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/platform-admin/**"],
              message: "Business features cannot depend on the platform administrator feature.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/features/platform-admin/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/components/business/**", "@/features/business/**"],
              message: "Platform administration must use shared domain features instead of business UI internals.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
