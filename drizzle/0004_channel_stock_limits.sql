ALTER TABLE "nightly_inventory" DROP CONSTRAINT "nightly_inventory_room_type_id_room_types_id_fk";
--> statement-breakpoint
ALTER TABLE "nightly_inventory" ADD COLUMN "website_limit" integer;--> statement-breakpoint
ALTER TABLE "room_types" ADD COLUMN "physical_units" integer;--> statement-breakpoint
ALTER TABLE "room_types" ADD COLUMN "website_limit" integer;--> statement-breakpoint
-- Backfill the approved demo types without changing operational rates or counters.
-- Unknown types and existing allotments above their new caps fail rather than being guessed or clamped.
UPDATE "room_types" SET
  "physical_units" = CASE "id" WHEN 'estate-room' THEN 48 WHEN 'garden-room' THEN 16 WHEN 'estate-villa' THEN 12 END,
  "website_limit" = CASE "id" WHEN 'estate-room' THEN 12 WHEN 'garden-room' THEN 4 WHEN 'estate-villa' THEN 3 END;
--> statement-breakpoint
UPDATE "nightly_inventory" AS inventory SET "website_limit" = room."website_limit"
FROM "room_types" AS room WHERE inventory."room_type_id" = room."id";
--> statement-breakpoint
ALTER TABLE "room_types" ALTER COLUMN "physical_units" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "room_types" ALTER COLUMN "website_limit" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "nightly_inventory" ALTER COLUMN "website_limit" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "room_types" ADD CONSTRAINT "room_type_website_limit_unique" UNIQUE("id","website_limit");--> statement-breakpoint
ALTER TABLE "nightly_inventory" ADD CONSTRAINT "inventory_room_website_limit_fk" FOREIGN KEY ("room_type_id","website_limit") REFERENCES "public"."room_types"("id","website_limit") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "nightly_inventory" ADD CONSTRAINT "inventory_nonnegative_website_limit" CHECK ("nightly_inventory"."website_limit" >= 0);--> statement-breakpoint
ALTER TABLE "nightly_inventory" ADD CONSTRAINT "inventory_allotment_within_website_limit" CHECK ("nightly_inventory"."allotment" <= "nightly_inventory"."website_limit");--> statement-breakpoint
ALTER TABLE "room_types" ADD CONSTRAINT "positive_physical_units" CHECK ("room_types"."physical_units" > 0);--> statement-breakpoint
ALTER TABLE "room_types" ADD CONSTRAINT "nonnegative_website_limit" CHECK ("room_types"."website_limit" >= 0);--> statement-breakpoint
ALTER TABLE "room_types" ADD CONSTRAINT "website_limit_within_physical_units" CHECK ("room_types"."website_limit" <= "room_types"."physical_units");
