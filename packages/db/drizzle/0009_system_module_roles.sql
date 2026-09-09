ALTER TABLE "users" ADD COLUMN "system_module_roles" jsonb DEFAULT '[]'::jsonb NOT NULL;
