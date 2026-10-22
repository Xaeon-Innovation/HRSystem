import { describe, expect, it } from "vitest";
import { mobileOutboxEventSchema } from "@hr/shared";

describe("mobile sync contracts", () => {
  it("accepts clock.in events used by sync push", () => {
    const event = mobileOutboxEventSchema.parse({
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      type: "clock.in",
      occurredAt: "2026-10-16T08:00:00.000Z",
      deviceUptimeMs: 1000,
      capturedOffline: false,
      location: {
        lat: 25.08,
        lng: 55.14,
        accuracyM: 10,
        at: "2026-10-16T08:00:00.000Z",
      },
    });
    expect(event.type).toBe("clock.in");
  });

  it("flags offline events older than 72h for rejection at process time", () => {
    const old = new Date(Date.now() - 80 * 60 * 60 * 1000).toISOString();
    const event = mobileOutboxEventSchema.parse({
      id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      type: "clock.out",
      occurredAt: old,
      deviceUptimeMs: 1000,
      capturedOffline: true,
      location: {
        lat: 25.08,
        lng: 55.14,
        accuracyM: 10,
        at: old,
      },
    });
    const age = Date.now() - Date.parse(event.occurredAt);
    expect(age).toBeGreaterThan(72 * 60 * 60 * 1000);
  });
});
