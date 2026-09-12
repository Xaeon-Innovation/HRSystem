ALTER TABLE "hiring_states" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "compensation_states" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;
