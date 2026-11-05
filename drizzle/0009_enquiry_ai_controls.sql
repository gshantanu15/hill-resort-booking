CREATE TABLE "enquiry_ai_controls" (
	"id" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"daily_request_limit" integer DEFAULT 100 NOT NULL,
	"daily_budget_micro" integer DEFAULT 1000000 NOT NULL,
	"lifetime_budget_micro" integer DEFAULT 5000000 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enquiry_ai_usage" (
	"id" uuid PRIMARY KEY NOT NULL,
	"enquiry_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reserved_micro" integer DEFAULT 50000 NOT NULL,
	"charged_micro" integer,
	"outcome" text DEFAULT 'processing' NOT NULL,
	"model" text NOT NULL,
	"provider" text,
	CONSTRAINT "enquiry_ai_usage_nonnegative" CHECK ("enquiry_ai_usage"."reserved_micro" >= 0 AND ("enquiry_ai_usage"."charged_micro" IS NULL OR "enquiry_ai_usage"."charged_micro" >= 0))
);
--> statement-breakpoint
ALTER TABLE "enquiries" ADD COLUMN "route_edited" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "enquiries" ADD COLUMN "draft_edited" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "enquiries" ADD COLUMN "route_revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "enquiries" ADD COLUMN "draft_revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "enquiries" ADD COLUMN "extracted" jsonb;--> statement-breakpoint
ALTER TABLE "enquiries" ADD COLUMN "analysis_token" uuid;--> statement-breakpoint
ALTER TABLE "enquiries" ADD COLUMN "analysis_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "enquiries" ADD COLUMN "analysed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "enquiries" ADD COLUMN "analysis_model" text;--> statement-breakpoint
ALTER TABLE "enquiries" ADD COLUMN "analysis_provider" text;--> statement-breakpoint
ALTER TABLE "enquiries" ADD COLUMN "analysis_failure" text;--> statement-breakpoint
ALTER TABLE "enquiries" ADD COLUMN "pricing" jsonb;--> statement-breakpoint
ALTER TABLE "enquiry_ai_usage" ADD CONSTRAINT "enquiry_ai_usage_enquiry_id_enquiries_id_fk" FOREIGN KEY ("enquiry_id") REFERENCES "public"."enquiries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "enquiry_ai_usage_created_idx" ON "enquiry_ai_usage" USING btree ("created_at");
--> statement-breakpoint
UPDATE "enquiries" SET "route_edited" = true, "draft_edited" = true;
--> statement-breakpoint
INSERT INTO "enquiry_ai_controls" ("id", "enabled") VALUES ('enquiry-ai', false) ON CONFLICT DO NOTHING;
