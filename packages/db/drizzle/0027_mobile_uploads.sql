CREATE TABLE IF NOT EXISTS "mobile_uploads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "purpose" text NOT NULL,
  "file_name" text NOT NULL,
  "mime" text NOT NULL,
  "size" integer NOT NULL,
  "data_url" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "mobile_uploads_tenant_user_idx" ON "mobile_uploads" ("tenant_id","user_id");
