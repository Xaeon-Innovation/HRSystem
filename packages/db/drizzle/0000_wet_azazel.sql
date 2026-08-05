CREATE TYPE "public"."employee_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."kpi_type" AS ENUM('numeric', 'qualitative');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('clock_in', 'clock_out', 'missed_clock_out', 'kpi_due', 'announcement');--> statement-breakpoint
CREATE TYPE "public"."review_period" AS ENUM('weekly', 'monthly', 'quarterly');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('super_admin', 'tenant_admin', 'employee');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TABLE "attendance_corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"attendance_id" uuid NOT NULL,
	"corrected_by_user_id" uuid NOT NULL,
	"before" jsonb NOT NULL,
	"after" jsonb NOT NULL,
	"note" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"clock_in_at" timestamp with time zone NOT NULL,
	"clock_out_at" timestamp with time zone,
	"clock_in_lat" double precision,
	"clock_in_lng" double precision,
	"clock_out_lat" double precision,
	"clock_out_lng" double precision,
	"client_event_id" text,
	"anomaly_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_live_locations" (
	"employee_id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_clocked_in" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"phone" text,
	"job_title" text,
	"device_info" text,
	"status" "employee_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"metric" text NOT NULL,
	"value" integer DEFAULT 1 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kpi_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"kpi_id" uuid NOT NULL,
	"employee_id" uuid,
	"role_target" "role",
	"due_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kpi_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "kpi_type" NOT NULL,
	"target_value" double precision,
	"review_period" "review_period" NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kpi_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"score" double precision NOT NULL,
	"notes" text,
	"review_date" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewer_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "location_pings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"client_ping_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"delivery_status" text DEFAULT 'pending' NOT NULL,
	"delivery_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"keys" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" "tenant_status" DEFAULT 'active' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" "role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_attendance_id_attendance_records_id_fk" FOREIGN KEY ("attendance_id") REFERENCES "public"."attendance_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_corrected_by_user_id_users_id_fk" FOREIGN KEY ("corrected_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_live_locations" ADD CONSTRAINT "employee_live_locations_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_live_locations" ADD CONSTRAINT "employee_live_locations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_metrics" ADD CONSTRAINT "health_metrics_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_assignments" ADD CONSTRAINT "kpi_assignments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_assignments" ADD CONSTRAINT "kpi_assignments_kpi_id_kpi_definitions_id_fk" FOREIGN KEY ("kpi_id") REFERENCES "public"."kpi_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_assignments" ADD CONSTRAINT "kpi_assignments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_definitions" ADD CONSTRAINT "kpi_definitions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_scores" ADD CONSTRAINT "kpi_scores_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_scores" ADD CONSTRAINT "kpi_scores_assignment_id_kpi_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."kpi_assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_scores" ADD CONSTRAINT "kpi_scores_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_pings" ADD CONSTRAINT "location_pings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_pings" ADD CONSTRAINT "location_pings_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "corrections_tenant_idx" ON "attendance_corrections" USING btree ("tenant_id","attendance_id");--> statement-breakpoint
CREATE INDEX "attendance_tenant_employee_idx" ON "attendance_records" USING btree ("tenant_id","employee_id");--> statement-breakpoint
CREATE INDEX "attendance_tenant_open_idx" ON "attendance_records" USING btree ("tenant_id","clock_out_at");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_client_event_uidx" ON "attendance_records" USING btree ("tenant_id","client_event_id");--> statement-breakpoint
CREATE INDEX "live_locations_tenant_idx" ON "employee_live_locations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "live_locations_tenant_clocked_idx" ON "employee_live_locations" USING btree ("tenant_id","is_clocked_in");--> statement-breakpoint
CREATE UNIQUE INDEX "employees_user_uidx" ON "employees" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "employees_tenant_idx" ON "employees" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "employees_tenant_status_idx" ON "employees" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "health_metrics_tenant_metric_idx" ON "health_metrics" USING btree ("tenant_id","metric");--> statement-breakpoint
CREATE INDEX "kpi_assign_tenant_idx" ON "kpi_assignments" USING btree ("tenant_id","employee_id");--> statement-breakpoint
CREATE INDEX "kpi_defs_tenant_idx" ON "kpi_definitions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "kpi_scores_tenant_idx" ON "kpi_scores" USING btree ("tenant_id","assignment_id");--> statement-breakpoint
CREATE INDEX "pings_tenant_recorded_idx" ON "location_pings" USING btree ("tenant_id","recorded_at");--> statement-breakpoint
CREATE INDEX "pings_tenant_employee_recorded_idx" ON "location_pings" USING btree ("tenant_id","employee_id","recorded_at");--> statement-breakpoint
CREATE INDEX "notifications_tenant_user_idx" ON "notifications" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "notifications_tenant_unread_idx" ON "notifications" USING btree ("tenant_id","user_id","read");--> statement-breakpoint
CREATE UNIQUE INDEX "push_endpoint_uidx" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "push_tenant_user_idx" ON "push_subscriptions" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_slug_uidx" ON "tenants" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "users_tenant_email_uidx" ON "users" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE INDEX "users_tenant_idx" ON "users" USING btree ("tenant_id");