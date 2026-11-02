CREATE TABLE "professional_patients" (
	"professional_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"clinical_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "professional_patients_professional_id_patient_id_pk" PRIMARY KEY("professional_id","patient_id")
);
--> statement-breakpoint
ALTER TABLE "professional_patients" ADD CONSTRAINT "professional_patients_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_patients" ADD CONSTRAINT "professional_patients_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_professional_patients_patient" ON "professional_patients" USING btree ("patient_id");--> statement-breakpoint
-- Backfill: existing single-professional ownership (keeps clinical notes with the relation)
INSERT INTO "professional_patients" ("professional_id", "patient_id", "clinical_notes")
SELECT "professional_id", "id", "clinical_notes" FROM "patients" WHERE "professional_id" IS NOT NULL
ON CONFLICT DO NOTHING;--> statement-breakpoint
-- Backfill: self-registered patients that already booked with a professional
INSERT INTO "professional_patients" ("professional_id", "patient_id")
SELECT DISTINCT "professional_id", "patient_id" FROM "appointments"
ON CONFLICT DO NOTHING;
