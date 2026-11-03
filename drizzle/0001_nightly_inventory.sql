CREATE TABLE "nightly_inventory" (
	"room_type_id" text NOT NULL,
	"stay_date" date NOT NULL,
	"allotment" integer NOT NULL,
	"booked" integer DEFAULT 0 NOT NULL,
	"blackout" boolean NOT NULL,
	CONSTRAINT "nightly_inventory_room_type_id_stay_date_pk" PRIMARY KEY("room_type_id","stay_date"),
	CONSTRAINT "inventory_nonnegative_allotment" CHECK ("nightly_inventory"."allotment" >= 0),
	CONSTRAINT "inventory_nonnegative_booked" CHECK ("nightly_inventory"."booked" >= 0),
	CONSTRAINT "inventory_booked_within_allotment" CHECK ("nightly_inventory"."booked" <= "nightly_inventory"."allotment")
);
--> statement-breakpoint
ALTER TABLE "nightly_inventory" ADD CONSTRAINT "nightly_inventory_room_type_id_room_types_id_fk" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE restrict ON UPDATE no action;