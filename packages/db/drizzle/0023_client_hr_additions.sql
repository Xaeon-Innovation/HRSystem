CREATE TYPE "public"."presence_mode" AS ENUM('fixed_zone', 'mobile');--> statement-breakpoint
CREATE TYPE "public"."employee_document_type" AS ENUM('passport', 'residency', 'driving_license', 'contract', 'other');--> statement-breakpoint
CREATE TYPE "public"."skill_level" AS ENUM('basic', 'competent', 'strong');--> statement-breakpoint
CREATE TYPE "public"."training_reason" AS ENUM('gap', 'strengthen');--> statement-breakpoint
CREATE TYPE "public"."training_status" AS ENUM('proposed', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."assessment_period" AS ENUM('weekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."performance_report_cadence" AS ENUM('daily', 'weekly', 'monthly');--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "presence_mode" "presence_mode" DEFAULT 'fixed_zone' NOT NULL;--> statement-breakpoint
ALTER TABLE "job_roles" ADD COLUMN IF NOT EXISTS "description" text;--> statement-breakpoint
ALTER TABLE "job_roles" ADD COLUMN IF NOT EXISTS "responsibilities" text;--> statement-breakpoint
ALTER TABLE "job_roles" ADD COLUMN IF NOT EXISTS "requirements" text;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job_role_criteria" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "job_role_id" uuid NOT NULL,
  "name" text NOT NULL,
  "metric" text,
  "target_value" double precision,
  "weight" double precision DEFAULT 1 NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "role_assessments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "employee_id" uuid NOT NULL,
  "job_role_id" uuid NOT NULL,
  "period" "assessment_period" NOT NULL,
  "period_start" date NOT NULL,
  "period_end" date NOT NULL,
  "scores" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "overall_comment" text,
  "reviewer_user_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "employee_id" uuid NOT NULL,
  "type" "employee_document_type" NOT NULL,
  "label" text,
  "document_number" text,
  "expires_on" date NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skills" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job_role_skills" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "job_role_id" uuid NOT NULL,
  "skill_id" uuid NOT NULL,
  "required_level" "skill_level" DEFAULT 'competent' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_skills" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "employee_id" uuid NOT NULL,
  "skill_id" uuid NOT NULL,
  "level" "skill_level" DEFAULT 'basic' NOT NULL,
  "note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "training_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "employee_id" uuid NOT NULL,
  "skill_id" uuid NOT NULL,
  "reason" "training_reason" DEFAULT 'gap' NOT NULL,
  "status" "training_status" DEFAULT 'proposed' NOT NULL,
  "note" text,
  "created_by_user_id" uuid,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "employee_id" uuid NOT NULL,
  "cadence" "performance_report_cadence" NOT NULL,
  "period_start" date NOT NULL,
  "period_end" date NOT NULL,
  "snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "feedback" text,
  "feedback_author_user_id" uuid,
  "generated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_role_criteria" ADD CONSTRAINT "job_role_criteria_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_role_criteria" ADD CONSTRAINT "job_role_criteria_job_role_id_job_roles_id_fk" FOREIGN KEY ("job_role_id") REFERENCES "public"."job_roles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "role_assessments" ADD CONSTRAINT "role_assessments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "role_assessments" ADD CONSTRAINT "role_assessments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "role_assessments" ADD CONSTRAINT "role_assessments_job_role_id_job_roles_id_fk" FOREIGN KEY ("job_role_id") REFERENCES "public"."job_roles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "role_assessments" ADD CONSTRAINT "role_assessments_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "skills" ADD CONSTRAINT "skills_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_role_skills" ADD CONSTRAINT "job_role_skills_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_role_skills" ADD CONSTRAINT "job_role_skills_job_role_id_job_roles_id_fk" FOREIGN KEY ("job_role_id") REFERENCES "public"."job_roles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_role_skills" ADD CONSTRAINT "job_role_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "employee_skills" ADD CONSTRAINT "employee_skills_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "employee_skills" ADD CONSTRAINT "employee_skills_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "employee_skills" ADD CONSTRAINT "employee_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "training_assignments" ADD CONSTRAINT "training_assignments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "training_assignments" ADD CONSTRAINT "training_assignments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "training_assignments" ADD CONSTRAINT "training_assignments_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "training_assignments" ADD CONSTRAINT "training_assignments_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "performance_reports" ADD CONSTRAINT "performance_reports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "performance_reports" ADD CONSTRAINT "performance_reports_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "performance_reports" ADD CONSTRAINT "performance_reports_feedback_author_user_id_users_id_fk" FOREIGN KEY ("feedback_author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_role_criteria_role_idx" ON "job_role_criteria" USING btree ("tenant_id","job_role_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "role_assessments_tenant_employee_idx" ON "role_assessments" USING btree ("tenant_id","employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "role_assessments_tenant_period_idx" ON "role_assessments" USING btree ("tenant_id","period_start","period_end");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_documents_tenant_employee_idx" ON "employee_documents" USING btree ("tenant_id","employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_documents_tenant_expires_idx" ON "employee_documents" USING btree ("tenant_id","expires_on");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "skills_tenant_name_uidx" ON "skills" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "skills_tenant_idx" ON "skills" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "job_role_skills_uidx" ON "job_role_skills" USING btree ("job_role_id","skill_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_role_skills_tenant_role_idx" ON "job_role_skills" USING btree ("tenant_id","job_role_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "employee_skills_uidx" ON "employee_skills" USING btree ("employee_id","skill_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_skills_tenant_employee_idx" ON "employee_skills" USING btree ("tenant_id","employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "training_assignments_tenant_employee_idx" ON "training_assignments" USING btree ("tenant_id","employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "training_assignments_tenant_status_idx" ON "training_assignments" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "performance_reports_uidx" ON "performance_reports" USING btree ("tenant_id","employee_id","cadence","period_start","period_end");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "performance_reports_tenant_employee_idx" ON "performance_reports" USING btree ("tenant_id","employee_id");
