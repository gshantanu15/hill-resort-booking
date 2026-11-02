CREATE TABLE "room_types" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"capacity" integer NOT NULL,
	"base_rate_paise" integer NOT NULL,
	"image" text NOT NULL,
	"image_alt" text NOT NULL,
	CONSTRAINT "positive_capacity" CHECK ("room_types"."capacity" > 0),
	CONSTRAINT "nonnegative_base_rate" CHECK ("room_types"."base_rate_paise" >= 0)
);
