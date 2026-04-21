CREATE TABLE "google_calendar_integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"google_sub" text NOT NULL,
	"google_email" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"access_token_expires_at" timestamp with time zone NOT NULL,
	"scope" text,
	"status" text DEFAULT 'active' NOT NULL,
	"last_error" text,
	"last_error_at" timestamp with time zone,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "google_calendar_integrations_professional_id_unique" UNIQUE("professional_id")
);
--> statement-breakpoint
ALTER TABLE "google_calendar_integrations" ADD CONSTRAINT "google_calendar_integrations_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;