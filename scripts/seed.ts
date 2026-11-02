import { config } from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { roomTypes } from "../src/db/schema";
import { sampleRooms } from "../src/db/sample-rooms";
config({ path: process.env.ENV_FILE ?? ".env.local", quiet: true });
if (!process.env.DATABASE_URL)
  throw new Error("Set DATABASE_URL in .env.local before seeding.");
const client = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
try {
  const db = drizzle(client);
  for (const room of sampleRooms)
    await db.insert(roomTypes).values(room).onConflictDoNothing();
  console.log(
    "Seed complete: sample room types inserted; existing records preserved.",
  );
} finally {
  await client.end();
}
