-- Owner-approved inclusive Estate rates. Only unchanged initial seed amounts are revised.
UPDATE "nightly_rates" SET "price_paise" = 900000
WHERE "room_type_id" = 'estate-room' AND "rate_plan_id" = 'standard-stay'
AND "stay_date" >= '2026-11-03' AND "stay_date" < '2027-05-02'
AND EXTRACT(ISODOW FROM "stay_date") NOT IN (5, 6) AND "price_paise" = 850000;
--> statement-breakpoint
UPDATE "nightly_rates" SET "price_paise" = 990000
WHERE "room_type_id" = 'estate-room' AND "rate_plan_id" = 'standard-stay'
AND "stay_date" >= '2026-11-03' AND "stay_date" < '2027-05-02'
AND EXTRACT(ISODOW FROM "stay_date") IN (5, 6) AND "price_paise" = 935000;
--> statement-breakpoint
UPDATE "room_types" SET "base_rate_paise" = 900000
WHERE "id" = 'estate-room' AND "base_rate_paise" = 850000;
