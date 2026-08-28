ALTER TYPE "notification_type" ADD VALUE 'alert';--> statement-breakpoint
CREATE TYPE "alert_category" AS ENUM('employee', 'leave', 'kpi', 'attendance', 'payroll', 'system', 'custom');--> statement-breakpoint
CREATE TYPE "alert_urgency" AS ENUM('info', 'warning', 'critical');--> statement-breakpoint
CREATE TYPE "alert_frequency" AS ENUM('instant', 'daily_digest', 'weekly_digest');--> statement-breakpoint
CREATE TYPE "alert_rule_kind" AS ENUM('catalog', 'custom');--> statement-breakpoint
CREATE TYPE "alert_source" AS ENUM('leave', 'attendance', 'kpi', 'employee', 'payroll', 'documents', 'location');--> statement-breakpoint
CREATE TYPE "alert_condition" AS ENUM('above', 'below', 'equal', 'missing', 'overdue', 'unchanged_days', 'trend_drop');--> statement-breakpoint
CREATE TYPE "alert_metric" AS ENUM('leave_balance', 'lateness_count', 'kpi_score', 'absences', 'expiring_document_days', 'pending_approvals', 'location_inactivity');--> statement-breakpoint
CREATE TYPE "alert_scope" AS ENUM('company', 'branch', 'department', 'role', 'employee');--> statement-breakpoint
CREATE TYPE "alert_duration_unit" AS ENUM('hours', 'days', 'months');--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "category" "alert_category";--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "urgency" "alert_urgency";--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "event_key" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX "notifications_tenant_event_idx" ON "notifications" ("tenant_id","event_key");--> statement-breakpoint
CREATE TABLE "alert_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"kind" "alert_rule_kind" DEFAULT 'catalog' NOT NULL,
	"event_key" text NOT NULL,
	"category" "alert_category" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"urgency" "alert_urgency" DEFAULT 'warning' NOT NULL,
	"channels" jsonb DEFAULT '["in_app"]'::jsonb NOT NULL,
	"frequency" "alert_frequency" DEFAULT 'instant' NOT NULL,
	"recipients" jsonb DEFAULT '["admin"]'::jsonb NOT NULL,
	"escalate_after_hours" integer,
	"source" "alert_source",
	"condition" "alert_condition",
	"metric" "alert_metric",
	"threshold" double precision,
	"duration_value" integer,
	"duration_unit" "alert_duration_unit",
	"scope" "alert_scope",
	"scope_id" uuid,
	"title_template" text,
	"body_template" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "alert_rules_tenant_event_uidx" ON "alert_rules" ("tenant_id","event_key");--> statement-breakpoint
CREATE INDEX "alert_rules_tenant_kind_idx" ON "alert_rules" ("tenant_id","kind");--> statement-breakpoint
CREATE INDEX "alert_rules_tenant_category_idx" ON "alert_rules" ("tenant_id","category");
