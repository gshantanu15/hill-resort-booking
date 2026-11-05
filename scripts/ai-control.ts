import { config, parse } from "dotenv";
import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { getDatabase } from "../src/db/client";
import { aiControls } from "../src/db/schema";
import { getEnquiryAIStatus } from "../src/lib/enquiry-analysis";

config({
  path: process.env.ENV_FILE ?? ".env.local",
  override: true,
  quiet: true,
});
const command = process.argv[2] ?? "status";
const host = (value: string) => new URL(value).hostname.replace("-pooler", "");
async function main() {
  if (!["status", "enable", "disable"].includes(command))
    throw Error("Use status, enable or disable.");
  const url = process.env.DATABASE_URL;
  if (!url) throw Error("Database configuration missing.");
  const production = parse(
    readFileSync(".env.demo.local", "utf8"),
  ).DATABASE_URL;
  if (production && host(production) === host(url))
    throw Error(
      "Production controls are deferred until the approved release workflow.",
    );
  const development = parse(readFileSync(".env.local", "utf8")).DATABASE_URL;
  const allowed = [
    host(development),
    "ep-small-bar-aopct83h.c-2.ap-southeast-1.aws.neon.tech",
  ];
  if (!allowed.includes(host(url)))
    throw Error("Unrecognised development/test target.");
  const connection = getDatabase();
  try {
    if (command !== "status")
      await connection.db
        .update(aiControls)
        .set({ enabled: command === "enable" })
        .where(eq(aiControls.id, "enquiry-ai"));
    console.log(
      JSON.stringify({
        target: host(url),
        databaseSwitch: command === "status" ? "unchanged" : command,
        ...(await getEnquiryAIStatus(connection.db)),
      }),
    );
  } finally {
    await connection.close();
  }
}
main().catch(() => {
  console.error(
    "AI control unavailable. No inference requested. Check the target and migration; credentials withheld.",
  );
  process.exitCode = 1;
});
