-- nieSchema stores DNI/NIEs uppercase; normalize existing rows so the unique constraint compares one spelling
UPDATE "patients" SET "nie" = upper("nie") WHERE "nie" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_nie_unique" UNIQUE("nie");
