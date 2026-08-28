ALTER TABLE "employees" ADD COLUMN "national_id" text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "date_of_birth" date;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "hire_date" date;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "emergency_contact_name" text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "emergency_contact_phone" text;--> statement-breakpoint
CREATE UNIQUE INDEX "employees_tenant_national_id_uidx" ON "employees" ("tenant_id","national_id") WHERE "national_id" IS NOT NULL;
