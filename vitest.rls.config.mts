import { defineConfig } from "vitest/config";

/** Testes de integração de RLS contra um Supabase real. Veja docs/TESTING.md. */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/rls/**/*.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 180_000,
    fileParallelism: false,
  },
});
