import { defineConfig, devices } from "@playwright/test";
import { config, parse } from "dotenv";
import { existsSync, readFileSync } from "node:fs";

config({
  path: process.env.ENV_FILE ?? ".env.test.local",
  override: true,
  quiet: true,
});
const testDatabase = process.env.TEST_DATABASE_URL;
if (!testDatabase)
  throw new Error(
    "Set TEST_DATABASE_URL to an explicitly isolated database before running regressions.",
  );
const host = (value: string) => new URL(value).hostname.replace("-pooler", "");
for (const file of [".env.local", ".env.demo.local"]) {
  if (!existsSync(file)) continue;
  const configured = parse(readFileSync(file));
  if (
    configured.DATABASE_URL &&
    host(testDatabase) === host(configured.DATABASE_URL)
  )
    throw new Error(
      "Regression database must differ from development and shared demo.",
    );
}
process.env.DATABASE_URL = testDatabase;
process.env.DATABASE_URL_UNPOOLED = testDatabase;
process.env.BETTER_AUTH_URL = "http://localhost:3000";
process.env.BETTER_AUTH_SECRET ??=
  "regression-only-secret-never-use-for-production";
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  workers: 1,
  timeout: 90000,
  use: { baseURL: "http://localhost:3000" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command: "npm run start -- --port 3000",
    url: "http://localhost:3000",
    reuseExistingServer: false,
  },
});
