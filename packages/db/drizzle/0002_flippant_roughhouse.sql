CREATE TYPE "public"."analytics_alert_severity" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."analytics_alert_status" AS ENUM('open', 'acknowledged', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."analytics_alert_type" AS ENUM('attendance_drop', 'off_route', 'low_productivity', 'sync_failure', 'reconciliation_drift', 'stale_sync');--> statement-breakpoint
CREATE TYPE "public"."analytics_entity_type" AS ENUM('employee', 'branch', 'connection', 'tenant');--> statement-breakpoint
CREATE TYPE "public"."branch_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."field_transform_type" AS ENUM('direct', 'enum_map', 'date_parse', 'number_parse', 'custom');--> statement-breakpoint
CREATE TYPE "public"."identity_match_method" AS ENUM('direct_id', 'email', 'phone', 'manual');--> statement-breakpoint
CREATE TYPE "public"."integration_auth_type" AS ENUM('api_key', 'bearer', 'oauth2', 'basic', 'none');--> statement-breakpoint
CREATE TYPE "public"."integration_processing_status" AS ENUM('pending', 'processed', 'failed', 'dead_letter');--> statement-breakpoint
CREATE TYPE "public"."integration_provider_type" AS ENUM('custom_api', 'webhook', 'csv', 'crm', 'cms', 'erp');--> statement-breakpoint
CREATE TYPE "public"."integration_connection_status" AS ENUM('draft', 'active', 'paused', 'error');--> statement-breakpoint
CREATE TYPE "public"."integration_sync_mode" AS ENUM('webhook', 'polling', 'manual', 'hybrid');--> statement-breakpoint
CREATE TYPE "public"."integration_sync_run_status" AS ENUM('running', 'success', 'partial', 'failed');--> statement-breakpoint
CREATE TYPE "public"."integration_sync_trigger" AS ENUM('schedule', 'webhook', 'manual', 'replay', 'csv');--> statement-breakpoint
CREATE TYPE "public"."metric_aggregation_level" AS ENUM('employee', 'branch', 'tenant');--> statement-breakpoint
CREATE TYPE "public"."metric_formula_type" AS ENUM('sql', 'expression', 'weighted_score');--> statement-breakpoint
CREATE TYPE "public"."metric_time_grain" AS ENUM('day', 'week', 'month');--> statement-breakpoint
CREATE TABLE "analytics_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"alert_type" "analytics_alert_type" NOT NULL,
	"severity" "analytics_alert_severity" DEFAULT 'medium' NOT NULL,
	"entity_type" "analytics_entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"alert_date" date NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"payload_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "analytics_alert_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_metric_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"formula_type" "metric_formula_type" DEFAULT 'expression' NOT NULL,
	"formula_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"aggregation_level" "metric_aggregation_level" DEFAULT 'tenant' NOT NULL,
	"time_grain" "metric_time_grain" DEFAULT 'day' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_metric_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"metric_definition_id" uuid NOT NULL,
	"entity_type" "analytics_entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"date_bucket" date NOT NULL,
	"value_numeric" double precision DEFAULT 0 NOT NULL,
	"value_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branch_daily_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"day" date NOT NULL,
	"active_employees" integer DEFAULT 0 NOT NULL,
	"clocked_in_employees" integer DEFAULT 0 NOT NULL,
	"attendance_rate" double precision DEFAULT 0 NOT NULL,
	"lateness_rate" double precision DEFAULT 0 NOT NULL,
	"missed_clock_outs" integer DEFAULT 0 NOT NULL,
	"jobs_completed_count" integer DEFAULT 0 NOT NULL,
	"visits_completed_count" integer DEFAULT 0 NOT NULL,
	"revenue_generated" double precision DEFAULT 0 NOT NULL,
	"labor_cost_estimate" double precision DEFAULT 0 NOT NULL,
	"productivity_index" double precision DEFAULT 0 NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"status" "branch_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canonical_customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"source_connection_id" uuid NOT NULL,
	"external_record_id" text NOT NULL,
	"name" text NOT NULL,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canonical_job_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"source_connection_id" uuid NOT NULL,
	"external_record_id" text NOT NULL,
	"employee_id" uuid,
	"branch_id" uuid,
	"site_id" uuid,
	"customer_id" uuid,
	"project_id" uuid,
	"event_type" text DEFAULT 'completed' NOT NULL,
	"status" text,
	"title" text,
	"category" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"scheduled_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"duration_minutes" integer,
	"value_amount" double precision,
	"currency" text,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canonical_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"source_connection_id" uuid NOT NULL,
	"external_record_id" text NOT NULL,
	"customer_id" uuid,
	"name" text NOT NULL,
	"status" text,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canonical_sales_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"source_connection_id" uuid NOT NULL,
	"external_record_id" text NOT NULL,
	"employee_id" uuid,
	"branch_id" uuid,
	"customer_id" uuid,
	"event_date" timestamp with time zone NOT NULL,
	"amount" double precision DEFAULT 0 NOT NULL,
	"currency" text,
	"status" text,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canonical_task_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"source_connection_id" uuid NOT NULL,
	"external_record_id" text NOT NULL,
	"employee_id" uuid,
	"assigned_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"due_at" timestamp with time zone,
	"task_type" text,
	"priority" text,
	"status" text,
	"points" double precision,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canonical_visit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"source_connection_id" uuid NOT NULL,
	"external_record_id" text NOT NULL,
	"employee_id" uuid,
	"branch_id" uuid,
	"site_id" uuid,
	"customer_id" uuid,
	"check_in_at" timestamp with time zone,
	"check_out_at" timestamp with time zone,
	"visit_duration_minutes" integer,
	"visit_status" text,
	"revenue_amount" double precision,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_daily_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"day" date NOT NULL,
	"branch_id" uuid,
	"was_clocked_in" boolean DEFAULT false NOT NULL,
	"total_work_minutes" integer DEFAULT 0 NOT NULL,
	"overtime_minutes" integer DEFAULT 0 NOT NULL,
	"lateness_minutes" integer DEFAULT 0 NOT NULL,
	"gps_updates_count" integer DEFAULT 0 NOT NULL,
	"gps_expected_count" integer DEFAULT 0 NOT NULL,
	"off_route_flags" integer DEFAULT 0 NOT NULL,
	"jobs_completed_count" integer DEFAULT 0 NOT NULL,
	"visits_completed_count" integer DEFAULT 0 NOT NULL,
	"tasks_completed_count" integer DEFAULT 0 NOT NULL,
	"tasks_assigned_count" integer DEFAULT 0 NOT NULL,
	"revenue_generated" double precision DEFAULT 0 NOT NULL,
	"labor_cost_estimate" double precision DEFAULT 0 NOT NULL,
	"kpi_score" double precision,
	"productivity_score" double precision DEFAULT 0 NOT NULL,
	"anomaly_score" double precision DEFAULT 0 NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "external_branch_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"external_branch_key" text NOT NULL,
	"branch_id" uuid,
	"site_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "external_employee_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"external_employee_key" text NOT NULL,
	"employee_id" uuid,
	"match_confidence" double precision DEFAULT 1 NOT NULL,
	"match_method" "identity_match_method" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"provider_type" "integration_provider_type" NOT NULL,
	"status" "integration_connection_status" DEFAULT 'draft' NOT NULL,
	"auth_type" "integration_auth_type" DEFAULT 'none' NOT NULL,
	"auth_config_encrypted" text,
	"base_url" text,
	"webhook_secret_encrypted" text,
	"sync_mode" "integration_sync_mode" DEFAULT 'manual' NOT NULL,
	"poll_interval_minutes" integer,
	"connector_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_sync_at" timestamp with time zone,
	"last_error" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_field_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"source_entity" text NOT NULL,
	"source_field" text NOT NULL,
	"target_entity" text NOT NULL,
	"target_field" text NOT NULL,
	"transform_type" "field_transform_type" DEFAULT 'direct' NOT NULL,
	"transform_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_raw_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"sync_run_id" uuid,
	"source_event_type" text NOT NULL,
	"external_record_id" text NOT NULL,
	"payload_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"processing_status" "integration_processing_status" DEFAULT 'pending' NOT NULL,
	"error_details" text
);
--> statement-breakpoint
CREATE TABLE "integration_sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"trigger_type" "integration_sync_trigger" NOT NULL,
	"status" "integration_sync_run_status" DEFAULT 'running' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"records_received" integer DEFAULT 0 NOT NULL,
	"records_processed" integer DEFAULT 0 NOT NULL,
	"records_failed" integer DEFAULT 0 NOT NULL,
	"error_summary" text,
	"cursor_json" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "site_id" uuid;--> statement-breakpoint
ALTER TABLE "analytics_alerts" ADD CONSTRAINT "analytics_alerts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_metric_definitions" ADD CONSTRAINT "analytics_metric_definitions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_metric_results" ADD CONSTRAINT "analytics_metric_results_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_metric_results" ADD CONSTRAINT "analytics_metric_results_metric_definition_id_analytics_metric_definitions_id_fk" FOREIGN KEY ("metric_definition_id") REFERENCES "public"."analytics_metric_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_daily_analytics" ADD CONSTRAINT "branch_daily_analytics_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_daily_analytics" ADD CONSTRAINT "branch_daily_analytics_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_customers" ADD CONSTRAINT "canonical_customers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_customers" ADD CONSTRAINT "canonical_customers_source_connection_id_integration_connections_id_fk" FOREIGN KEY ("source_connection_id") REFERENCES "public"."integration_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_job_events" ADD CONSTRAINT "canonical_job_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_job_events" ADD CONSTRAINT "canonical_job_events_source_connection_id_integration_connections_id_fk" FOREIGN KEY ("source_connection_id") REFERENCES "public"."integration_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_job_events" ADD CONSTRAINT "canonical_job_events_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_job_events" ADD CONSTRAINT "canonical_job_events_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_job_events" ADD CONSTRAINT "canonical_job_events_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_job_events" ADD CONSTRAINT "canonical_job_events_customer_id_canonical_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."canonical_customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_job_events" ADD CONSTRAINT "canonical_job_events_project_id_canonical_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."canonical_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_projects" ADD CONSTRAINT "canonical_projects_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_projects" ADD CONSTRAINT "canonical_projects_source_connection_id_integration_connections_id_fk" FOREIGN KEY ("source_connection_id") REFERENCES "public"."integration_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_projects" ADD CONSTRAINT "canonical_projects_customer_id_canonical_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."canonical_customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_sales_events" ADD CONSTRAINT "canonical_sales_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_sales_events" ADD CONSTRAINT "canonical_sales_events_source_connection_id_integration_connections_id_fk" FOREIGN KEY ("source_connection_id") REFERENCES "public"."integration_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_sales_events" ADD CONSTRAINT "canonical_sales_events_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_sales_events" ADD CONSTRAINT "canonical_sales_events_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_sales_events" ADD CONSTRAINT "canonical_sales_events_customer_id_canonical_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."canonical_customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_task_events" ADD CONSTRAINT "canonical_task_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_task_events" ADD CONSTRAINT "canonical_task_events_source_connection_id_integration_connections_id_fk" FOREIGN KEY ("source_connection_id") REFERENCES "public"."integration_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_task_events" ADD CONSTRAINT "canonical_task_events_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_visit_events" ADD CONSTRAINT "canonical_visit_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_visit_events" ADD CONSTRAINT "canonical_visit_events_source_connection_id_integration_connections_id_fk" FOREIGN KEY ("source_connection_id") REFERENCES "public"."integration_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_visit_events" ADD CONSTRAINT "canonical_visit_events_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_visit_events" ADD CONSTRAINT "canonical_visit_events_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_visit_events" ADD CONSTRAINT "canonical_visit_events_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_visit_events" ADD CONSTRAINT "canonical_visit_events_customer_id_canonical_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."canonical_customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_daily_analytics" ADD CONSTRAINT "employee_daily_analytics_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_daily_analytics" ADD CONSTRAINT "employee_daily_analytics_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_daily_analytics" ADD CONSTRAINT "employee_daily_analytics_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_branch_links" ADD CONSTRAINT "external_branch_links_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_branch_links" ADD CONSTRAINT "external_branch_links_connection_id_integration_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."integration_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_branch_links" ADD CONSTRAINT "external_branch_links_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_branch_links" ADD CONSTRAINT "external_branch_links_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_employee_links" ADD CONSTRAINT "external_employee_links_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_employee_links" ADD CONSTRAINT "external_employee_links_connection_id_integration_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."integration_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_employee_links" ADD CONSTRAINT "external_employee_links_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_field_mappings" ADD CONSTRAINT "integration_field_mappings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_field_mappings" ADD CONSTRAINT "integration_field_mappings_connection_id_integration_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."integration_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_raw_events" ADD CONSTRAINT "integration_raw_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_raw_events" ADD CONSTRAINT "integration_raw_events_connection_id_integration_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."integration_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_raw_events" ADD CONSTRAINT "integration_raw_events_sync_run_id_integration_sync_runs_id_fk" FOREIGN KEY ("sync_run_id") REFERENCES "public"."integration_sync_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_sync_runs" ADD CONSTRAINT "integration_sync_runs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_sync_runs" ADD CONSTRAINT "integration_sync_runs_connection_id_integration_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."integration_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_alerts_tenant_status_idx" ON "analytics_alerts" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "analytics_alerts_tenant_date_idx" ON "analytics_alerts" USING btree ("tenant_id","alert_date");--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_metric_defs_uidx" ON "analytics_metric_definitions" USING btree ("tenant_id","key","version");--> statement-breakpoint
CREATE INDEX "analytics_metric_defs_key_idx" ON "analytics_metric_definitions" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_metric_results_uidx" ON "analytics_metric_results" USING btree ("tenant_id","metric_definition_id","entity_type","entity_id","date_bucket","version");--> statement-breakpoint
CREATE INDEX "analytics_metric_results_lookup_idx" ON "analytics_metric_results" USING btree ("tenant_id","entity_type","date_bucket");--> statement-breakpoint
CREATE UNIQUE INDEX "branch_daily_analytics_uidx" ON "branch_daily_analytics" USING btree ("tenant_id","branch_id","day");--> statement-breakpoint
CREATE UNIQUE INDEX "branches_tenant_code_uidx" ON "branches" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "branches_tenant_idx" ON "branches" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "canonical_customers_ext_uidx" ON "canonical_customers" USING btree ("tenant_id","source_connection_id","external_record_id");--> statement-breakpoint
CREATE UNIQUE INDEX "canonical_job_events_ext_uidx" ON "canonical_job_events" USING btree ("tenant_id","source_connection_id","external_record_id");--> statement-breakpoint
CREATE INDEX "canonical_job_events_employee_idx" ON "canonical_job_events" USING btree ("tenant_id","employee_id","occurred_at");--> statement-breakpoint
CREATE INDEX "canonical_job_events_branch_idx" ON "canonical_job_events" USING btree ("tenant_id","branch_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "canonical_projects_ext_uidx" ON "canonical_projects" USING btree ("tenant_id","source_connection_id","external_record_id");--> statement-breakpoint
CREATE UNIQUE INDEX "canonical_sales_events_ext_uidx" ON "canonical_sales_events" USING btree ("tenant_id","source_connection_id","external_record_id");--> statement-breakpoint
CREATE INDEX "canonical_sales_events_employee_idx" ON "canonical_sales_events" USING btree ("tenant_id","employee_id","event_date");--> statement-breakpoint
CREATE UNIQUE INDEX "canonical_task_events_ext_uidx" ON "canonical_task_events" USING btree ("tenant_id","source_connection_id","external_record_id");--> statement-breakpoint
CREATE INDEX "canonical_task_events_employee_idx" ON "canonical_task_events" USING btree ("tenant_id","employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "canonical_visit_events_ext_uidx" ON "canonical_visit_events" USING btree ("tenant_id","source_connection_id","external_record_id");--> statement-breakpoint
CREATE INDEX "canonical_visit_events_employee_idx" ON "canonical_visit_events" USING btree ("tenant_id","employee_id","check_in_at");--> statement-breakpoint
CREATE UNIQUE INDEX "employee_daily_analytics_uidx" ON "employee_daily_analytics" USING btree ("tenant_id","employee_id","day");--> statement-breakpoint
CREATE INDEX "employee_daily_analytics_branch_idx" ON "employee_daily_analytics" USING btree ("tenant_id","branch_id","day");--> statement-breakpoint
CREATE UNIQUE INDEX "external_branch_links_uidx" ON "external_branch_links" USING btree ("tenant_id","connection_id","external_branch_key");--> statement-breakpoint
CREATE UNIQUE INDEX "external_employee_links_uidx" ON "external_employee_links" USING btree ("tenant_id","connection_id","external_employee_key");--> statement-breakpoint
CREATE INDEX "external_employee_links_employee_idx" ON "external_employee_links" USING btree ("tenant_id","employee_id");--> statement-breakpoint
CREATE INDEX "integration_connections_tenant_idx" ON "integration_connections" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "integration_connections_tenant_status_idx" ON "integration_connections" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "integration_mappings_connection_idx" ON "integration_field_mappings" USING btree ("tenant_id","connection_id");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_raw_events_ext_uidx" ON "integration_raw_events" USING btree ("tenant_id","connection_id","external_record_id","source_event_type");--> statement-breakpoint
CREATE INDEX "integration_raw_events_status_idx" ON "integration_raw_events" USING btree ("tenant_id","processing_status");--> statement-breakpoint
CREATE INDEX "integration_raw_events_received_idx" ON "integration_raw_events" USING btree ("tenant_id","received_at");--> statement-breakpoint
CREATE INDEX "integration_sync_runs_connection_idx" ON "integration_sync_runs" USING btree ("tenant_id","connection_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sites_tenant_code_uidx" ON "sites" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "sites_tenant_branch_idx" ON "sites" USING btree ("tenant_id","branch_id");--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "employees_tenant_branch_idx" ON "employees" USING btree ("tenant_id","branch_id");