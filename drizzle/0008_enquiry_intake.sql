CREATE TABLE "enquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"request_fingerprint" text NOT NULL,
	"source" text DEFAULT 'website' NOT NULL,
	"contact_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"contact_phone" text,
	"message" text NOT NULL,
	"category" text DEFAULT 'unsorted' NOT NULL,
	"owner" text,
	"needs_review" boolean DEFAULT true NOT NULL,
	"gm_attention" boolean DEFAULT true NOT NULL,
	"processing_state" text DEFAULT 'unprocessed' NOT NULL,
	"draft" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enquiries_submission_id_unique" UNIQUE("submission_id"),
	CONSTRAINT "enquiry_source_valid" CHECK ("enquiries"."source" IN ('website','email','whatsapp')),
	CONSTRAINT "enquiry_message_length" CHECK (length(btrim("enquiries"."message")) BETWEEN 1 AND 4000),
	CONSTRAINT "enquiry_category_valid" CHECK ("enquiries"."category" IN ('room','wedding','offsite','complaint','unsorted')),
	CONSTRAINT "enquiry_owner_valid" CHECK ("enquiries"."owner" IS NULL OR "enquiries"."owner" IN ('reservations','sales','gm'))
);
--> statement-breakpoint
CREATE INDEX "enquiry_created_idx" ON "enquiries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "enquiry_email_created_idx" ON "enquiries" USING btree ("contact_email","created_at");