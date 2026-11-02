import { check, integer, pgTable, text } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
export const roomTypes = pgTable(
  "room_types",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    capacity: integer("capacity").notNull(),
    baseRatePaise: integer("base_rate_paise").notNull(),
    image: text("image").notNull(),
    imageAlt: text("image_alt").notNull(),
  },
  (t) => [
    check("positive_capacity", sql`${t.capacity} > 0`),
    check("nonnegative_base_rate", sql`${t.baseRatePaise} >= 0`),
  ],
);
