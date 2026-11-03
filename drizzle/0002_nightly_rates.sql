CREATE TABLE "nightly_rates" (
	"room_type_id" text NOT NULL,
	"rate_plan_id" text NOT NULL,
	"stay_date" date NOT NULL,
	"price_paise" integer NOT NULL,
	CONSTRAINT "nightly_rates_room_type_id_rate_plan_id_stay_date_pk" PRIMARY KEY("room_type_id","rate_plan_id","stay_date"),
	CONSTRAINT "nightly_rate_positive_price" CHECK ("nightly_rates"."price_paise" > 0)
);
--> statement-breakpoint
CREATE TABLE "rate_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "rate_plan_nonblank_id" CHECK ("rate_plans"."id" ~ '[^[:space:]]'),
	CONSTRAINT "rate_plan_nonblank_name" CHECK ("rate_plans"."name" ~ '[^[:space:]]')
);
--> statement-breakpoint
ALTER TABLE "nightly_rates" ADD CONSTRAINT "nightly_rates_room_type_id_room_types_id_fk" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nightly_rates" ADD CONSTRAINT "nightly_rates_rate_plan_id_rate_plans_id_fk" FOREIGN KEY ("rate_plan_id") REFERENCES "public"."rate_plans"("id") ON DELETE restrict ON UPDATE no action;