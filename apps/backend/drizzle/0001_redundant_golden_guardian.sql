CREATE TABLE "consent_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consent_document_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"professional_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"signature_data" text,
	"signed_at" timestamp with time zone,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_patient_consent_doc" UNIQUE("consent_document_id","patient_id")
);
--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "contact_method" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "contact_method" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "professionals" ADD COLUMN "business_name" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "first_name" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "last_name" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "consent_documents" ADD CONSTRAINT "consent_documents_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_consent_document_id_consent_documents_id_fk" FOREIGN KEY ("consent_document_id") REFERENCES "public"."consent_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE no action ON UPDATE no action;