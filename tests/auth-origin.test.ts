import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { configuredBaseURL } from "../src/lib/auth";

afterEach(() => vi.unstubAllEnvs());
it("uses the isolated deployment origin for preview authentication", () => {
  vi.stubEnv("BETTER_AUTH_URL", "");
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("VERCEL_URL", "isolated.example.test");
  vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "production.example.test");
  expect(configuredBaseURL()).toBe("https://isolated.example.test");
  vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000/");
  expect(configuredBaseURL()).toBe("http://localhost:3000");
});
it("retains production and local origin defaults", () => {
  vi.stubEnv("BETTER_AUTH_URL", "");
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "production.example.test");
  expect(configuredBaseURL()).toBe("https://production.example.test");
  vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
  expect(configuredBaseURL()).toBe("http://localhost:3000");
});
