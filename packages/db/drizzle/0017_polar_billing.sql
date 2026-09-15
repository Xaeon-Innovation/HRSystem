ALTER TABLE "plans" ADD COLUMN "polar_product_id" text;-->statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD COLUMN "polar_subscription_id" text;-->statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD COLUMN "polar_customer_id" text;-->statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD COLUMN "purchased_seats" integer;-->statement-breakpoint
CREATE UNIQUE INDEX "plans_polar_product_uidx" ON "plans" USING btree ("polar_product_id");-->statement-breakpoint
CREATE UNIQUE INDEX "tenant_subscriptions_polar_uidx" ON "tenant_subscriptions" USING btree ("polar_subscription_id");
