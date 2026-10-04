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
    // Propios de Picado:
    "design-system/**",
    "public/**",
    "playwright-report/**",
    "test-results/**",
  ]),
  // Solo aplica al Pages Router y su plugin arma una regex inválida con rutas
  // dinámicas que tienen loading.tsx (src/app/(app)/g/[gid]/…), lo que rompe todo el lint.
  {
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },
]);

export default eslintConfig;
