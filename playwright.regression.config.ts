import { defineConfig, devices } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parse } from "dotenv";

const testEnv = process.env.ENV_FILE ?? ".env.test.local";
const testDatabase =
  process.env.TEST_DATABASE_URL ??
  (existsSync(testEnv)
    ? parse(readFileSync(testEnv)).TEST_DATABASE_URL
    : undefined);

// Verified in Neon for hill_resort_booking as the disposable child of development.
// Recheck the branch and compute metadata before rotating this entry.
const isolatedHost = "ep-small-bar-aopct83h.c-2.ap-southeast-1.aws.neon.tech";
const isolatedUntil = Date.parse("2026-11-07T18:00:00Z");
if (!testDatabase || Date.now() >= isolatedUntil) {
  throw new Error(
    "An active, verified isolated regression database is required.",
  );
}
const databaseUrl = new URL(testDatabase);
const host = (value: string) => new URL(value).hostname.replace("-pooler", "");
if (
  !["postgres:", "postgresql:"].includes(databaseUrl.protocol) ||
  host(testDatabase) !== isolatedHost
) {
  throw new Error(
    "Regression database must use the verified isolated endpoint.",
  );
}
for (const file of [".env.local", ".env.demo.local"]) {
  if (!existsSync(file)) continue;
  const configured = parse(readFileSync(file));
  for (const url of [
    configured.DATABASE_URL,
    configured.DATABASE_URL_UNPOOLED,
  ]) {
    if (url && host(url) === isolatedHost) {
      throw new Error(
        "Regression database must differ from development and shared demo.",
      );
    }
  }
}

const port = 3011;
const baseURL = `http://localhost:${port}`;
process.env.TEST_DATABASE_URL = testDatabase;
process.env.DATABASE_URL = testDatabase;
process.env.DATABASE_URL_UNPOOLED = testDatabase;
process.env.BETTER_AUTH_URL = baseURL;
process.env.BETTER_AUTH_SECRET = randomBytes(32).toString("hex");
process.env.AI_INFERENCE_ENABLED = "false";
process.env.OPENROUTER_API_KEY = "";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  workers: 1,
  timeout: 90000,
  use: { baseURL, actionTimeout: 8000 },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command: `npm run start -- --hostname localhost --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
  },
});
