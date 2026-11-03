import {
  boolean,
  check,
  date,
  integer,
  pgTable,
  primaryKey,
  text,
} from "drizzle-orm/pg-core";
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

export const nightlyInventory = pgTable(
  "nightly_inventory",
  {
    roomTypeId: text("room_type_id")
      .notNull()
      .references(() => roomTypes.id, { onDelete: "restrict" }),
    stayDate: date("stay_date", { mode: "string" }).notNull(),
    allotment: integer("allotment").notNull(),
    booked: integer("booked").notNull().default(0),
    blackout: boolean("blackout").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.roomTypeId, t.stayDate] }),
    check("inventory_nonnegative_allotment", sql`${t.allotment} >= 0`),
    check("inventory_nonnegative_booked", sql`${t.booked} >= 0`),
    check(
      "inventory_booked_within_allotment",
      sql`${t.booked} <= ${t.allotment}`,
    ),
  ],
);
