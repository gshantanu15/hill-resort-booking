import { defineConfig } from "@playwright/test";
import regression from "./playwright.regression.config";

const url = new URL(process.env.HOSTED_REVIEW_URL ?? "http://invalid");
// This deployment was created with the verified isolated database and AI disabled.
// Re-verify deployment environment bindings before replacing this allowlisted URL.
const isolatedHost =
  "hill-resort-booking-8sugr2ahr-shans-projects-5a3cd5ba.vercel.app";
if (url.protocol !== "https:" || url.hostname !== isolatedHost)
  throw new Error(
    "Hosted regressions require an isolated deployment URL; production aliases are forbidden.",
  );
const bypass = process.env.HOSTED_REVIEW_COOKIE;
if (!bypass) throw new Error("Supply the private preview access cookie.");
export default defineConfig({
  ...regression,
  webServer: undefined,
  testMatch: [
    "**/day2.spec.ts",
    "**/day3.spec.ts",
    "**/day5.spec.ts",
    "**/enquiry.spec.ts",
    "**/staff-enquiry.spec.ts",
    "**/home.spec.ts",
  ],
  outputDir: "test-results-hosted",
  use: {
    baseURL: url.origin,
    storageState: {
      cookies: [
        {
          name: "_vercel_jwt",
          value: bypass,
          domain: url.hostname,
          path: "/",
          expires: -1,
          httpOnly: true,
          secure: true,
          sameSite: "None",
        },
      ],
      origins: [],
    },
  },
});
