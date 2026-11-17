CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX "idx_patients_email_trgm" ON "patients" USING gin ("email" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_patients_full_name_trgm" ON "patients" USING gin (("first_name" || ' ' || "last_name") gin_trgm_ops);