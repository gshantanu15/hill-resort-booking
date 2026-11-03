CREATE TABLE "booking_items" (
	"booking_id" uuid NOT NULL,
	"room_type_id" text NOT NULL,
	"room_type_name" text NOT NULL,
	"quantity" integer NOT NULL,
	"adults" integer NOT NULL,
	"children" integer NOT NULL,
	CONSTRAINT "booking_items_booking_id_room_type_id_pk" PRIMARY KEY("booking_id","room_type_id"),
	CONSTRAINT "booking_item_room_name_nonblank" CHECK ("booking_items"."room_type_name" ~ '[^[:space:]]'),
	CONSTRAINT "booking_item_positive_quantity" CHECK ("booking_items"."quantity" > 0),
	CONSTRAINT "booking_item_nonnegative_adults" CHECK ("booking_items"."adults" >= 0),
	CONSTRAINT "booking_item_nonnegative_children" CHECK ("booking_items"."children" >= 0)
);
--> statement-breakpoint
CREATE TABLE "booking_nights" (
	"booking_id" uuid NOT NULL,
	"room_type_id" text NOT NULL,
	"stay_date" date NOT NULL,
	"unit_price_paise" integer NOT NULL,
	"subtotal_paise" integer NOT NULL,
	"tax_paise" integer NOT NULL,
	"total_paise" integer NOT NULL,
	"tax_rate_bps" integer NOT NULL,
	"rate_includes_tax" boolean NOT NULL,
	CONSTRAINT "booking_nights_booking_id_room_type_id_stay_date_pk" PRIMARY KEY("booking_id","room_type_id","stay_date"),
	CONSTRAINT "booking_night_positive_unit_price" CHECK ("booking_nights"."unit_price_paise" > 0),
	CONSTRAINT "booking_night_nonnegative_subtotal" CHECK ("booking_nights"."subtotal_paise" >= 0),
	CONSTRAINT "booking_night_nonnegative_tax" CHECK ("booking_nights"."tax_paise" >= 0),
	CONSTRAINT "booking_night_positive_total" CHECK ("booking_nights"."total_paise" > 0),
	CONSTRAINT "booking_night_nonnegative_tax_rate" CHECK ("booking_nights"."tax_rate_bps" >= 0),
	CONSTRAINT "booking_night_total_matches" CHECK ("booking_nights"."total_paise"::bigint = "booking_nights"."subtotal_paise"::bigint + "booking_nights"."tax_paise"::bigint)
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"request_fingerprint" text NOT NULL,
	"contact_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"contact_phone" text,
	"check_in" date NOT NULL,
	"check_out" date NOT NULL,
	"adults" integer NOT NULL,
	"children" integer NOT NULL,
	"rate_plan_id" text NOT NULL,
	"rate_plan_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_submission_id_unique" UNIQUE("submission_id"),
	CONSTRAINT "booking_request_fingerprint_sha256" CHECK ("bookings"."request_fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "booking_contact_name_nonblank" CHECK ("bookings"."contact_name" ~ '[^[:space:]]'),
	CONSTRAINT "booking_contact_email_nonblank" CHECK ("bookings"."contact_email" ~ '[^[:space:]]'),
	CONSTRAINT "booking_contact_phone_nonblank" CHECK ("bookings"."contact_phone" IS NULL OR "bookings"."contact_phone" ~ '[^[:space:]]'),
	CONSTRAINT "booking_rate_plan_name_nonblank" CHECK ("bookings"."rate_plan_name" ~ '[^[:space:]]'),
	CONSTRAINT "booking_date_order" CHECK ("bookings"."check_out" > "bookings"."check_in"),
	CONSTRAINT "booking_nonnegative_adults" CHECK ("bookings"."adults" >= 0),
	CONSTRAINT "booking_nonnegative_children" CHECK ("bookings"."children" >= 0),
	CONSTRAINT "booking_has_guests" CHECK ("bookings"."adults"::bigint + "bookings"."children"::bigint > 0)
);
--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_room_type_id_room_types_id_fk" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_nights" ADD CONSTRAINT "booking_nights_booking_id_room_type_id_booking_items_booking_id_room_type_id_fk" FOREIGN KEY ("booking_id","room_type_id") REFERENCES "public"."booking_items"("booking_id","room_type_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_rate_plan_id_rate_plans_id_fk" FOREIGN KEY ("rate_plan_id") REFERENCES "public"."rate_plans"("id") ON DELETE restrict ON UPDATE no action;