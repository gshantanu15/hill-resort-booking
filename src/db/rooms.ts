import "server-only";
import { getDatabase } from "./client";
import { roomTypes } from "./schema";
import { sampleRooms } from "./sample-rooms";
export async function listRooms() {
  if (!process.env.DATABASE_URL)
    return { rooms: sampleRooms, source: "sample" as const };
  const { db, close } = getDatabase();
  try {
    return {
      rooms: await db.select().from(roomTypes).orderBy(roomTypes.baseRatePaise),
      source: "database" as const,
    };
  } finally {
    await close();
  }
}
