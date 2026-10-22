CREATE TABLE IF NOT EXISTS "client_events" (
  "id" uuid PRIMARY KEY NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "device_id" uuid,
  "type" text NOT NULL,
  "status" text NOT NULL,
  "result_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "received_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "client_events_tenant_user_idx" ON "client_events" ("tenant_id","user_id");
CREATE INDEX IF NOT EXISTS "client_events_tenant_received_idx" ON "client_events" ("tenant_id","received_at");
