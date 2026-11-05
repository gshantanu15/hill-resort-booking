import {
  boolean,
  check,
  date,
  foreignKey,
  integer,
  jsonb,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { EnquiryAIOutput } from "../lib/enquiry-ai-output";
import type { BookingSelection } from "../lib/booking-validation";
export * from "./auth-schema";
export const enquiries = pgTable(
  "enquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id").notNull().unique(),
    requestFingerprint: text("request_fingerprint").notNull(),
    source: text("source").notNull().default("website"),
    contactName: text("contact_name").notNull(),
    contactEmail: text("contact_email").notNull(),
    contactPhone: text("contact_phone"),
    message: text("message").notNull(),
    category: text("category").notNull().default("unsorted"),
    owner: text("owner"),
    needsReview: boolean("needs_review").notNull().default(true),
    gmAttention: boolean("gm_attention").notNull().default(true),
    processingState: text("processing_state").notNull().default("unprocessed"),
    draft: text("draft").notNull().default(""),
    routeEdited: boolean("route_edited").notNull().default(false),
    draftEdited: boolean("draft_edited").notNull().default(false),
    routeRevision: integer("route_revision").notNull().default(0),
    draftRevision: integer("draft_revision").notNull().default(0),
    extracted: jsonb("extracted").$type<EnquiryAIOutput>(),
    analysisToken: uuid("analysis_token"),
    analysisStartedAt: timestamp("analysis_started_at", { withTimezone: true }),
    analysedAt: timestamp("analysed_at", { withTimezone: true }),
    analysisModel: text("analysis_model"),
    analysisProvider: text("analysis_provider"),
    analysisFailure: text("analysis_failure"),
    pricing: jsonb("pricing").$type<{
      totalPaise: number;
      subtotalPaise: number;
      taxPaise: number;
      checkedAt: string;
      expiresAt: string;
      selection: BookingSelection;
      fingerprint: string;
      resultingDraft: string;
      block: string;
    }>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("enquiry_created_idx").on(t.createdAt),
    index("enquiry_email_created_idx").on(t.contactEmail, t.createdAt),
    check(
      "enquiry_source_valid",
      sql`${t.source} IN ('website','email','whatsapp')`,
    ),
    check(
      "enquiry_message_length",
      sql`length(btrim(${t.message})) BETWEEN 1 AND 4000`,
    ),
    check(
      "enquiry_category_valid",
      sql`${t.category} IN ('room','wedding','offsite','complaint','unsorted')`,
    ),
    check(
      "enquiry_owner_valid",
      sql`${t.owner} IS NULL OR ${t.owner} IN ('reservations','sales','gm')`,
    ),
  ],
);
export const aiControls = pgTable("enquiry_ai_controls", {
  id: text("id").primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  dailyRequestLimit: integer("daily_request_limit").notNull().default(100),
  dailyBudgetMicro: integer("daily_budget_micro").notNull().default(1000000),
  lifetimeBudgetMicro: integer("lifetime_budget_micro")
    .notNull()
    .default(5000000),
});
export const aiUsage = pgTable(
  "enquiry_ai_usage",
  {
    id: uuid("id").primaryKey(),
    enquiryId: uuid("enquiry_id").references(() => enquiries.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    reservedMicro: integer("reserved_micro").notNull().default(50000),
    chargedMicro: integer("charged_micro"),
    outcome: text("outcome").notNull().default("processing"),
    model: text("model").notNull(),
    provider: text("provider"),
  },
  (t) => [
    index("enquiry_ai_usage_created_idx").on(t.createdAt),
    check(
      "enquiry_ai_usage_nonnegative",
      sql`${t.reservedMicro} >= 0 AND (${t.chargedMicro} IS NULL OR ${t.chargedMicro} >= 0)`,
    ),
  ],
);
export const roomTypes = pgTable(
  "room_types",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    capacity: integer("capacity").notNull(),
    physicalUnits: integer("physical_units").notNull(),
    websiteLimit: integer("website_limit").notNull(),
    baseRatePaise: integer("base_rate_paise").notNull(),
    image: text("image").notNull(),
    imageAlt: text("image_alt").notNull(),
  },
  (t) => [
    check("positive_capacity", sql`${t.capacity} > 0`),
    check("positive_physical_units", sql`${t.physicalUnits} > 0`),
    check("nonnegative_website_limit", sql`${t.websiteLimit} >= 0`),
    check(
      "website_limit_within_physical_units",
      sql`${t.websiteLimit} <= ${t.physicalUnits}`,
    ),
    unique("room_type_website_limit_unique").on(t.id, t.websiteLimit),
    check("nonnegative_base_rate", sql`${t.baseRatePaise} >= 0`),
  ],
);

export const nightlyInventory = pgTable(
  "nightly_inventory",
  {
    roomTypeId: text("room_type_id").notNull(),
    stayDate: date("stay_date", { mode: "string" }).notNull(),
    websiteLimit: integer("website_limit").notNull(),
    allotment: integer("allotment").notNull(),
    booked: integer("booked").notNull().default(0),
    blackout: boolean("blackout").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.roomTypeId, t.stayDate] }),
    foreignKey({
      name: "inventory_room_website_limit_fk",
      columns: [t.roomTypeId, t.websiteLimit],
      foreignColumns: [roomTypes.id, roomTypes.websiteLimit],
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    check("inventory_nonnegative_website_limit", sql`${t.websiteLimit} >= 0`),
    check(
      "inventory_allotment_within_website_limit",
      sql`${t.allotment} <= ${t.websiteLimit}`,
    ),
    check("inventory_nonnegative_allotment", sql`${t.allotment} >= 0`),
    check("inventory_nonnegative_booked", sql`${t.booked} >= 0`),
    check(
      "inventory_booked_within_allotment",
      sql`${t.booked} <= ${t.allotment}`,
    ),
  ],
);

export const ratePlans = pgTable(
  "rate_plans",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
  },
  (t) => [
    check("rate_plan_nonblank_id", sql`${t.id} ~ '[^[:space:]]'`),
    check("rate_plan_nonblank_name", sql`${t.name} ~ '[^[:space:]]'`),
  ],
);

export const nightlyRates = pgTable(
  "nightly_rates",
  {
    roomTypeId: text("room_type_id")
      .notNull()
      .references(() => roomTypes.id, { onDelete: "restrict" }),
    ratePlanId: text("rate_plan_id")
      .notNull()
      .references(() => ratePlans.id, { onDelete: "restrict" }),
    stayDate: date("stay_date", { mode: "string" }).notNull(),
    pricePaise: integer("price_paise").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.roomTypeId, t.ratePlanId, t.stayDate] }),
    check("nightly_rate_positive_price", sql`${t.pricePaise} > 0`),
  ],
);

// Confirmation must write booking rows and inventory counters in one transaction.
export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id").notNull().unique(),
    requestFingerprint: text("request_fingerprint").notNull(),
    contactName: text("contact_name").notNull(),
    contactEmail: text("contact_email").notNull(),
    contactPhone: text("contact_phone"),
    termsVersion: text("terms_version"),
    dataUseVersion: text("data_use_version"),
    policyAcceptedAt: timestamp("policy_accepted_at", { withTimezone: true }),
    checkIn: date("check_in", { mode: "string" }).notNull(),
    checkOut: date("check_out", { mode: "string" }).notNull(),
    adults: integer("adults").notNull(),
    children: integer("children").notNull(),
    ratePlanId: text("rate_plan_id")
      .notNull()
      .references(() => ratePlans.id, { onDelete: "restrict" }),
    ratePlanName: text("rate_plan_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      "booking_request_fingerprint_sha256",
      sql`${t.requestFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "booking_contact_name_nonblank",
      sql`${t.contactName} ~ '[^[:space:]]'`,
    ),
    check(
      "booking_contact_email_nonblank",
      sql`${t.contactEmail} ~ '[^[:space:]]'`,
    ),
    check(
      "booking_contact_phone_nonblank",
      sql`${t.contactPhone} IS NULL OR ${t.contactPhone} ~ '[^[:space:]]'`,
    ),
    check(
      "booking_rate_plan_name_nonblank",
      sql`${t.ratePlanName} ~ '[^[:space:]]'`,
    ),
    check("booking_date_order", sql`${t.checkOut} > ${t.checkIn}`),
    check("booking_nonnegative_adults", sql`${t.adults} >= 0`),
    check("booking_nonnegative_children", sql`${t.children} >= 0`),
    check(
      "booking_has_guests",
      sql`${t.adults}::bigint + ${t.children}::bigint > 0`,
    ),
  ],
);

export const bookingItems = pgTable(
  "booking_items",
  {
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "restrict" }),
    roomTypeId: text("room_type_id")
      .notNull()
      .references(() => roomTypes.id, { onDelete: "restrict" }),
    roomTypeName: text("room_type_name").notNull(),
    quantity: integer("quantity").notNull(),
    adults: integer("adults").notNull(),
    children: integer("children").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.bookingId, t.roomTypeId] }),
    check(
      "booking_item_room_name_nonblank",
      sql`${t.roomTypeName} ~ '[^[:space:]]'`,
    ),
    check("booking_item_positive_quantity", sql`${t.quantity} > 0`),
    check("booking_item_nonnegative_adults", sql`${t.adults} >= 0`),
    check("booking_item_nonnegative_children", sql`${t.children} >= 0`),
  ],
);

export const bookingNights = pgTable(
  "booking_nights",
  {
    bookingId: uuid("booking_id").notNull(),
    roomTypeId: text("room_type_id").notNull(),
    stayDate: date("stay_date", { mode: "string" }).notNull(),
    unitPricePaise: integer("unit_price_paise").notNull(),
    subtotalPaise: integer("subtotal_paise").notNull(),
    taxPaise: integer("tax_paise").notNull(),
    totalPaise: integer("total_paise").notNull(),
    taxRateBps: integer("tax_rate_bps").notNull(),
    rateIncludesTax: boolean("rate_includes_tax").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.bookingId, t.roomTypeId, t.stayDate] }),
    foreignKey({
      columns: [t.bookingId, t.roomTypeId],
      foreignColumns: [bookingItems.bookingId, bookingItems.roomTypeId],
    }).onDelete("restrict"),
    check("booking_night_positive_unit_price", sql`${t.unitPricePaise} > 0`),
    check("booking_night_nonnegative_subtotal", sql`${t.subtotalPaise} >= 0`),
    check("booking_night_nonnegative_tax", sql`${t.taxPaise} >= 0`),
    check("booking_night_positive_total", sql`${t.totalPaise} > 0`),
    check("booking_night_nonnegative_tax_rate", sql`${t.taxRateBps} >= 0`),
    check(
      "booking_night_total_matches",
      sql`${t.totalPaise}::bigint = ${t.subtotalPaise}::bigint + ${t.taxPaise}::bigint`,
    ),
  ],
);
