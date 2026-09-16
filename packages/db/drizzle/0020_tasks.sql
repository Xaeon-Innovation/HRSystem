CREATE TYPE "public"."task_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('open', 'in_progress', 'submitted', 'changes_requested', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."task_assignment_mode" AS ENUM('shared', 'individual');--> statement-breakpoint
CREATE TYPE "public"."task_attachment_kind" AS ENUM('link', 'file');--> statement-breakpoint
CREATE TYPE "public"."task_deliverable_type" AS ENUM('report', 'docs', 'screenshots', 'other');--> statement-breakpoint
CREATE TYPE "public"."task_activity_kind" AS ENUM('created', 'started', 'attached', 'deliverable_submitted', 'completed', 'submitted', 'reviewed', 'send_back', 'cancelled');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "title" text NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "priority" "task_priority" DEFAULT 'medium' NOT NULL,
  "status" "task_status" DEFAULT 'open' NOT NULL,
  "due_at" timestamp with time zone,
  "requires_review" boolean DEFAULT false NOT NULL,
  "assignment_mode" "task_assignment_mode" DEFAULT 'shared' NOT NULL,
  "batch_id" uuid,
  "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "assignee_targets" jsonb DEFAULT '{"employeeIds":[],"jobRoleIds":[],"branchIds":[]}'::jsonb NOT NULL,
  "created_by_user_id" uuid NOT NULL,
  "review_note" text,
  "completed_at" timestamp with time zone,
  "completed_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "task_assignees" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "task_id" uuid NOT NULL,
  "employee_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "task_attachments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "task_id" uuid NOT NULL,
  "kind" "task_attachment_kind" NOT NULL,
  "name" text NOT NULL,
  "mime" text,
  "size" integer,
  "url" text,
  "data_url" text,
  "uploaded_by_user_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "task_deliverable_requirements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "task_id" uuid NOT NULL,
  "type" "task_deliverable_type" NOT NULL,
  "label" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "task_deliverable_submissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "task_id" uuid NOT NULL,
  "requirement_id" uuid NOT NULL,
  "employee_id" uuid NOT NULL,
  "uploaded_by_user_id" uuid NOT NULL,
  "kind" "task_attachment_kind" NOT NULL,
  "name" text NOT NULL,
  "mime" text,
  "size" integer,
  "url" text,
  "data_url" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "task_activity" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "task_id" uuid NOT NULL,
  "kind" "task_activity_kind" NOT NULL,
  "actor_user_id" uuid NOT NULL,
  "actor_employee_id" uuid,
  "message" text NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_completed_by_user_id_users_id_fk" FOREIGN KEY ("completed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_deliverable_requirements" ADD CONSTRAINT "task_deliverable_requirements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_deliverable_requirements" ADD CONSTRAINT "task_deliverable_requirements_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_deliverable_submissions" ADD CONSTRAINT "task_deliverable_submissions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_deliverable_submissions" ADD CONSTRAINT "task_deliverable_submissions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_deliverable_submissions" ADD CONSTRAINT "task_deliverable_submissions_requirement_id_task_deliverable_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."task_deliverable_requirements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_deliverable_submissions" ADD CONSTRAINT "task_deliverable_submissions_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_deliverable_submissions" ADD CONSTRAINT "task_deliverable_submissions_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_activity" ADD CONSTRAINT "task_activity_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_activity" ADD CONSTRAINT "task_activity_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_activity" ADD CONSTRAINT "task_activity_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_activity" ADD CONSTRAINT "task_activity_actor_employee_id_employees_id_fk" FOREIGN KEY ("actor_employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_tenant_idx" ON "tasks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_tenant_status_idx" ON "tasks" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_tenant_due_idx" ON "tasks" USING btree ("tenant_id","due_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_tenant_batch_idx" ON "tasks" USING btree ("tenant_id","batch_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "task_assignees_task_employee_uidx" ON "task_assignees" USING btree ("task_id","employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_assignees_tenant_employee_idx" ON "task_assignees" USING btree ("tenant_id","employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_assignees_tenant_task_idx" ON "task_assignees" USING btree ("tenant_id","task_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_attachments_tenant_task_idx" ON "task_attachments" USING btree ("tenant_id","task_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_deliverable_reqs_tenant_task_idx" ON "task_deliverable_requirements" USING btree ("tenant_id","task_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_deliverable_subs_tenant_task_idx" ON "task_deliverable_submissions" USING btree ("tenant_id","task_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_deliverable_subs_req_idx" ON "task_deliverable_submissions" USING btree ("requirement_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_activity_tenant_task_idx" ON "task_activity" USING btree ("tenant_id","task_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_activity_tenant_created_idx" ON "task_activity" USING btree ("tenant_id","created_at");
