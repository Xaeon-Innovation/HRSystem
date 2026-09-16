CREATE TABLE IF NOT EXISTS "platform_modules" (
  "key" text PRIMARY KEY NOT NULL,
  "launch_status" text DEFAULT 'ga' NOT NULL,
  "label_override" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
