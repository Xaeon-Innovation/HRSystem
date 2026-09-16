CREATE TYPE "public"."lead_source" AS ENUM('demo', 'signup_trial', 'signup_paid', 'enterprise');-->statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'qualified', 'converted', 'closed');-->statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "lead_source" NOT NULL,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"name" text NOT NULL,
	"company" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"message" text,
	"tenant_id" uuid,
	"plan_code" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
-->statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;-->statement-breakpoint
CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status");-->statement-breakpoint
CREATE INDEX "leads_created_at_idx" ON "leads" USING btree ("created_at");-->statement-breakpoint
CREATE INDEX "leads_email_idx" ON "leads" USING btree ("email");-->statement-breakpoint
CREATE INDEX "leads_tenant_idx" ON "leads" USING btree ("tenant_id");
