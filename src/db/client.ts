import "server-only";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
export function getDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  const client = postgres(url, {
    max: 1,
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 20,
  });
  return { db: drizzle(client, { schema }), close: () => client.end() };
}
