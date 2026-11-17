-- The API stores DNI/NIEs uppercase, emails lowercase and phones without formatting: normalize existing rows so the unique constraints compare one spelling
UPDATE "patients" SET "nie" = upper("nie"), "email" = lower("email"), "phone" = regexp_replace("phone", '[\s()-]', '', 'g');--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_nie_unique" UNIQUE("nie");--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_phone_unique" UNIQUE("phone");--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_email_unique" UNIQUE("email");
