import { config } from "dotenv";
import { defineConfig } from "vitest/config";

config({ path: process.env.ENV_FILE ?? ".env.test.local", quiet: true });

export default defineConfig({
  test: {
    include: ["tests/db/**/*.integration.ts"],
    testTimeout: 20000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
