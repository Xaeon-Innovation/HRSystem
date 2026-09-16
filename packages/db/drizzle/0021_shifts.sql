ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'overtime_prompt';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'late_clock_in';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'late_clock_out';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'left_zone_exit';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'break_overstay';--> statement-breakpoint
CREATE TYPE "public"."shift_cadence" AS ENUM('daily', 'weekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."shift_instance_status" AS ENUM('scheduled', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."shift_overtime_status" AS ENUM('none', 'prompted', 'approved', 'declined', 'late_unanswered');--> statement-breakpoint
CREATE TYPE "public"."break_period_mode" AS ENUM('fixed', 'flexible');--> statement-breakpoint
CREATE TYPE "public"."break_session_status" AS ENUM('scheduled', 'active', 'ended', 'overstayed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."break_session_source" AS ENUM('fixed_window', 'employee_request', 'admin_assigned');--> statement-breakpoint
CREATE TYPE "public"."left_zone_phase" AS ENUM('mid_shift', 'end_grace', 'overtime', 'break_overstay');--> statement-breakpoint
CREATE TYPE "public"."left_zone_incident_status" AS ENUM('pending', 'approved_emergency', 'day_deduction');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shift_patterns" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "employee_id" uuid NOT NULL,
  "cadence" "shift_cadence" NOT NULL,
  "work_date" date,
  "weekdays" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "month_days" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "start_time" text NOT NULL,
  "end_time" text NOT NULL,
  "effective_from" date,
  "effective_until" date,
  "active" boolean DEFAULT true NOT NULL,
  "created_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shift_instances" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "employee_id" uuid NOT NULL,
  "pattern_id" uuid,
  "work_date" date NOT NULL,
  "start_at" timestamp with time zone NOT NULL,
  "end_at" timestamp with time zone NOT NULL,
  "status" "shift_instance_status" DEFAULT 'scheduled' NOT NULL,
  "attendance_record_id" uuid,
  "late_clock_in" boolean DEFAULT false NOT NULL,
  "late_clock_out" boolean DEFAULT false NOT NULL,
  "overtime_status" "shift_overtime_status" DEFAULT 'none' NOT NULL,
  "overtime_prompted_at" timestamp with time zone,
  "overtime_responded_at" timestamp with time zone,
  "auto_clock_out_reason" text,
  "day_deduction" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "break_policies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "employee_id" uuid,
  "enabled" boolean DEFAULT true NOT NULL,
  "duration_minutes" integer DEFAULT 60 NOT NULL,
  "period_mode" "break_period_mode" DEFAULT 'flexible' NOT NULL,
  "fixed_start_time" text,
  "fixed_end_time" text,
  "max_breaks_per_shift" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "break_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "employee_id" uuid NOT NULL,
  "shift_instance_id" uuid NOT NULL,
  "attendance_record_id" uuid NOT NULL,
  "status" "break_session_status" DEFAULT 'scheduled' NOT NULL,
  "planned_start_at" timestamp with time zone,
  "planned_end_at" timestamp with time zone,
  "started_at" timestamp with time zone,
  "ended_at" timestamp with time zone,
  "source" "break_session_source" NOT NULL,
  "duration_minutes" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "left_zone_incidents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "employee_id" uuid NOT NULL,
  "shift_instance_id" uuid,
  "attendance_record_id" uuid NOT NULL,
  "detected_at" timestamp with time zone NOT NULL,
  "lat" double precision NOT NULL,
  "lng" double precision NOT NULL,
  "phase" "left_zone_phase" NOT NULL,
  "status" "left_zone_incident_status" DEFAULT 'pending' NOT NULL,
  "resolved_at" timestamp with time zone,
  "resolved_by_user_id" uuid,
  "resolution_note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "shift_patterns" ADD CONSTRAINT "shift_patterns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_patterns" ADD CONSTRAINT "shift_patterns_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_patterns" ADD CONSTRAINT "shift_patterns_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_instances" ADD CONSTRAINT "shift_instances_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_instances" ADD CONSTRAINT "shift_instances_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_instances" ADD CONSTRAINT "shift_instances_pattern_id_shift_patterns_id_fk" FOREIGN KEY ("pattern_id") REFERENCES "public"."shift_patterns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_instances" ADD CONSTRAINT "shift_instances_attendance_record_id_attendance_records_id_fk" FOREIGN KEY ("attendance_record_id") REFERENCES "public"."attendance_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "break_policies" ADD CONSTRAINT "break_policies_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "break_policies" ADD CONSTRAINT "break_policies_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "break_sessions" ADD CONSTRAINT "break_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "break_sessions" ADD CONSTRAINT "break_sessions_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "break_sessions" ADD CONSTRAINT "break_sessions_shift_instance_id_shift_instances_id_fk" FOREIGN KEY ("shift_instance_id") REFERENCES "public"."shift_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "break_sessions" ADD CONSTRAINT "break_sessions_attendance_record_id_attendance_records_id_fk" FOREIGN KEY ("attendance_record_id") REFERENCES "public"."attendance_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "left_zone_incidents" ADD CONSTRAINT "left_zone_incidents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "left_zone_incidents" ADD CONSTRAINT "left_zone_incidents_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "left_zone_incidents" ADD CONSTRAINT "left_zone_incidents_shift_instance_id_shift_instances_id_fk" FOREIGN KEY ("shift_instance_id") REFERENCES "public"."shift_instances"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "left_zone_incidents" ADD CONSTRAINT "left_zone_incidents_attendance_record_id_attendance_records_id_fk" FOREIGN KEY ("attendance_record_id") REFERENCES "public"."attendance_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "left_zone_incidents" ADD CONSTRAINT "left_zone_incidents_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shift_patterns_tenant_employee_idx" ON "shift_patterns" USING btree ("tenant_id","employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shift_patterns_tenant_active_idx" ON "shift_patterns" USING btree ("tenant_id","active");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "shift_instances_employee_date_uidx" ON "shift_instances" USING btree ("tenant_id","employee_id","work_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shift_instances_tenant_date_idx" ON "shift_instances" USING btree ("tenant_id","work_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shift_instances_tenant_employee_idx" ON "shift_instances" USING btree ("tenant_id","employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "break_policies_tenant_idx" ON "break_policies" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "break_policies_tenant_global_uidx" ON "break_policies" USING btree ("tenant_id") WHERE "employee_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "break_policies_tenant_employee_uidx" ON "break_policies" USING btree ("tenant_id","employee_id") WHERE "employee_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "break_sessions_tenant_employee_idx" ON "break_sessions" USING btree ("tenant_id","employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "break_sessions_shift_idx" ON "break_sessions" USING btree ("shift_instance_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "break_sessions_status_idx" ON "break_sessions" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "left_zone_incidents_tenant_status_idx" ON "left_zone_incidents" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "left_zone_incidents_tenant_employee_idx" ON "left_zone_incidents" USING btree ("tenant_id","employee_id");
