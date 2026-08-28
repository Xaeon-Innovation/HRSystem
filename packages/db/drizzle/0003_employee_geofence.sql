ALTER TABLE "employees" ADD COLUMN "geofence_lat" double precision;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "geofence_lng" double precision;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "geofence_radius_meters" integer;
