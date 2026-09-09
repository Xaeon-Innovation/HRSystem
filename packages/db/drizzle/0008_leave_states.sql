CREATE TABLE "leave_states" (
	"tenant_id" uuid PRIMARY KEY NOT NULL,
	"snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "leave_states" ADD CONSTRAINT "leave_states_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
