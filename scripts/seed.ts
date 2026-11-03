import { config } from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/db/schema";
import { seedDemoData } from "../src/db/seed";
config({ path: process.env.ENV_FILE ?? ".env.local", quiet: true });
if (!process.env.DATABASE_URL)
  throw new Error("Set DATABASE_URL in .env.local before seeding.");
const client = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
try {
  const inserted = await seedDemoData(drizzle(client, { schema }));
  console.log(
    "Seed complete; existing operational records preserved.",
    inserted,
  );
} finally {
  await client.end();
}
