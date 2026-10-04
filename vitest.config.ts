import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "vitest/config";

// Claves del Supabase local para los tests de RLS (las escribe el setup desde `supabase status -o env`).
const dbEnv = loadEnv({ path: ".env.test.local", quiet: true }).parsed ?? {};

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          include: ["src/**/*.test.{ts,tsx}"],
          setupFiles: ["./vitest.setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "db",
          environment: "node",
          include: ["supabase/tests/**/*.test.ts"],
          env: dbEnv,
          testTimeout: 30_000,
          hookTimeout: 30_000,
          fileParallelism: false,
        },
      },
    ],
  },
});
