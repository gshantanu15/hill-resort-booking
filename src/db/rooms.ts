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
      rooms: await db
        .select({
          id: roomTypes.id,
          name: roomTypes.name,
          description: roomTypes.description,
          capacity: roomTypes.capacity,
          baseRatePaise: roomTypes.baseRatePaise,
          image: roomTypes.image,
          imageAlt: roomTypes.imageAlt,
        })
        .from(roomTypes)
        .orderBy(roomTypes.baseRatePaise),
      source: "database" as const,
    };
  } finally {
    await close();
  }
}
