ALTER TABLE "patients" DROP CONSTRAINT "patients_professional_id_professionals_id_fk";
--> statement-breakpoint
ALTER TABLE "patients" DROP COLUMN "professional_id";--> statement-breakpoint
ALTER TABLE "patients" DROP COLUMN "clinical_notes";