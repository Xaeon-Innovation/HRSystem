CREATE TABLE "job_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "job_roles" ADD CONSTRAINT "job_roles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "job_roles_tenant_name_uidx" ON "job_roles" ("tenant_id", lower("name"));--> statement-breakpoint
CREATE INDEX "job_roles_tenant_idx" ON "job_roles" ("tenant_id");--> statement-breakpoint
CREATE TABLE "employee_job_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"job_role_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "employee_job_roles" ADD CONSTRAINT "employee_job_roles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_job_roles" ADD CONSTRAINT "employee_job_roles_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_job_roles" ADD CONSTRAINT "employee_job_roles_job_role_id_job_roles_id_fk" FOREIGN KEY ("job_role_id") REFERENCES "public"."job_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "employee_job_roles_uidx" ON "employee_job_roles" ("employee_id","job_role_id");--> statement-breakpoint
CREATE INDEX "employee_job_roles_tenant_employee_idx" ON "employee_job_roles" ("tenant_id","employee_id");--> statement-breakpoint
CREATE INDEX "employee_job_roles_tenant_role_idx" ON "employee_job_roles" ("tenant_id","job_role_id");
