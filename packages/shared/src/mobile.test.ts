import { describe, expect, it } from "vitest";
import {
  mobileMeSchema,
  mobileOutboxEventSchema,
  mobilePushResultSchema,
  mobileSyncPushBodySchema,
} from "./mobile.js";

describe("mobile contracts", () => {
  it("parses a Me payload", () => {
    const me = mobileMeSchema.parse({
      user: {
        id: "11111111-1111-1111-1111-111111111111",
        email: "a@example.com",
        name: "Ada",
        employeeId: "22222222-2222-2222-2222-222222222222",
      },
      tenant: {
        id: "33333333-3333-3333-3333-333333333333",
        slug: "nile",
        name: "Nile",
      },
      role: "employee",
      moduleRoles: [],
      presenceMode: "fixed_zone",
      zones: [
        {
          id: "zone-self",
          lat: 25.08,
          lng: 55.14,
          radiusMeters: 120,
        },
      ],
      entitlements: {
        fieldOps: true,
        liveMap: true,
        teamToday: false,
        leave: true,
        tasks: true,
      },
      managerOf: 0,
    });
    expect(me.tenant.accentPreset).toBe("lime");
    expect(me.locale).toBe("en");
  });

  it("accepts clock.in outbox events", () => {
    const event = mobileOutboxEventSchema.parse({
      id: "44444444-4444-4444-4444-444444444444",
      type: "clock.in",
      occurredAt: "2026-10-16T08:00:00.000Z",
      deviceUptimeMs: 12_000,
      capturedOffline: true,
      location: {
        lat: 25.08,
        lng: 55.14,
        accuracyM: 12,
        at: "2026-10-16T08:00:00.000Z",
      },
    });
    expect(event.type).toBe("clock.in");
  });

  it("rejects empty sync push batches", () => {
    expect(() => mobileSyncPushBodySchema.parse({ events: [] })).toThrow();
  });

  it("parses push results", () => {
    const r = mobilePushResultSchema.parse({
      id: "44444444-4444-4444-4444-444444444444",
      status: "duplicate",
      serverTime: "2026-10-16T08:00:01.000Z",
    });
    expect(r.status).toBe("duplicate");
  });
});
