import { config } from "dotenv";
import postgres from "postgres";
import { assertResetTarget, resetDemoDatabase } from "../src/db/reset-demo";
let client: postgres.Sql | undefined;
try {
  config({
    path: process.env.ENV_FILE ?? ".env.local",
    override: true,
    quiet: true,
  });
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("Database configuration is missing.");
  const host = assertResetTarget(url);
  const execute = process.argv.includes("--execute");
  const confirmation = process.argv
    .find((arg) => arg.startsWith("--confirm="))
    ?.slice(10);
  if (!execute)
    console.log(
      JSON.stringify({
        dryRun: true,
        target: host,
        message:
          "No changes made. Re-run with --execute --confirm=<exact-hostname>.",
      }),
    );
  else {
    if (confirmation !== host)
      throw new Error("Reset confirmation does not match the approved target.");
    client = postgres(url, { max: 1, prepare: false, connect_timeout: 10 });
    console.log(JSON.stringify(await resetDemoDatabase(client)));
  }
} catch {
  console.error(
    "Demo reset refused or failed; no credentials or database details were printed.",
  );
  process.exitCode = 1;
} finally {
  if (client) await client.end();
}
