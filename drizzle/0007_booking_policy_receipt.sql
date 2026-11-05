ALTER TABLE "bookings" ADD COLUMN "terms_version" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "data_use_version" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "policy_accepted_at" timestamp with time zone;