ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "must_change_password" boolean DEFAULT false NOT NULL;

DO $$ BEGIN
  CREATE TYPE "public"."mobile_platform" AS ENUM('ios', 'android');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "mobile_devices" (
  "id" uuid PRIMARY KEY NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "platform" "mobile_platform" NOT NULL,
  "model" text,
  "app_version" text,
  "push_token" text,
  "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "mobile_devices_tenant_user_idx" ON "mobile_devices" ("tenant_id","user_id");
CREATE INDEX IF NOT EXISTS "mobile_devices_user_idx" ON "mobile_devices" ("user_id");

CREATE TABLE IF NOT EXISTS "mobile_refresh_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "device_id" uuid NOT NULL REFERENCES "mobile_devices"("id") ON DELETE cascade,
  "token_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "replaced_by" uuid,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "mobile_refresh_tokens_hash_uidx" ON "mobile_refresh_tokens" ("token_hash");
CREATE INDEX IF NOT EXISTS "mobile_refresh_tokens_device_idx" ON "mobile_refresh_tokens" ("device_id");
