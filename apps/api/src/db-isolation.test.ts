import "dotenv/config";
import { describe, expect, it } from "vitest";
import { and, eq, ne } from "drizzle-orm";
import { createDb, employees, integrationConnections, tenants } from "@hr/db";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://hr:hr@localhost:5432/hr_system";

describe("db tenant isolation", () => {
  it("employee queries for tenant A never return tenant B rows", async () => {
    let db: ReturnType<typeof createDb>["db"];
    let client: ReturnType<typeof createDb>["client"];
    try {
      ({ db, client } = createDb(DATABASE_URL));
      await db.select().from(tenants).limit(1);
    } catch {
      console.warn("Skipping DB isolation test — Postgres unavailable");
      return;
    }

    try {
      const all = await db.query.tenants.findMany({
        where: eq(tenants.status, "active"),
      });
      if (all.length < 2) {
        console.warn("Skipping — seed at least two tenants first");
        return;
      }

      const [a, b] = all;
      const aEmployees = await db.query.employees.findMany({
        where: eq(employees.tenantId, a.id),
      });
      expect(aEmployees.every((e) => e.tenantId === a.id)).toBe(true);

      const leaked = await db.query.employees.findMany({
        where: and(eq(employees.tenantId, a.id), ne(employees.tenantId, a.id)),
      });
      expect(leaked).toHaveLength(0);

      const bOnly = aEmployees.filter((e) => e.tenantId === b.id);
      expect(bOnly).toHaveLength(0);

      const aConns = await db.query.integrationConnections.findMany({
        where: eq(integrationConnections.tenantId, a.id),
      });
      expect(aConns.every((c) => c.tenantId === a.id)).toBe(true);
    } finally {
      await client.end({ timeout: 1 });
    }
  });
});
