import { describe, expect, it } from "vitest";

/** Mirrors apps/mobile/lib/sync/aggregate.ts — keep ordering lanes stable. */
function aggregateKeyFor(
  type: string,
  userId: string,
  taskId?: string,
): string {
  if (
    type.startsWith("clock.") ||
    type.startsWith("break.") ||
    type.startsWith("overtime.") ||
    type.startsWith("zone.")
  ) {
    return `clock:${userId}`;
  }
  if (type.startsWith("leave.")) return "leave";
  if (type.startsWith("task.") && taskId) return `task:${taskId}`;
  if (type === "notification.readAll") return "notification:all";
  if (type.startsWith("notification.")) return "notification";
  return "misc";
}

describe("outbox aggregate ordering", () => {
  it("lanes clock events per user", () => {
    expect(aggregateKeyFor("clock.in", "u1")).toBe("clock:u1");
    expect(aggregateKeyFor("clock.out", "u1")).toBe("clock:u1");
    expect(aggregateKeyFor("break.start", "u2")).toBe("clock:u2");
  });

  it("lanes tasks by task id", () => {
    expect(aggregateKeyFor("task.status", "u1", "t-9")).toBe("task:t-9");
  });

  it("sorts pending batch by aggregate then time", () => {
    const rows = [
      { aggregateKey: "task:b", occurredAt: "2026-01-01T10:00:00Z" },
      { aggregateKey: "clock:u1", occurredAt: "2026-01-01T12:00:00Z" },
      { aggregateKey: "clock:u1", occurredAt: "2026-01-01T11:00:00Z" },
      { aggregateKey: "task:a", occurredAt: "2026-01-01T09:00:00Z" },
    ];
    rows.sort((a, b) => {
      const ag = a.aggregateKey.localeCompare(b.aggregateKey);
      if (ag !== 0) return ag;
      return a.occurredAt.localeCompare(b.occurredAt);
    });
    expect(rows.map((r) => `${r.aggregateKey}@${r.occurredAt}`)).toEqual([
      "clock:u1@2026-01-01T11:00:00Z",
      "clock:u1@2026-01-01T12:00:00Z",
      "task:a@2026-01-01T09:00:00Z",
      "task:b@2026-01-01T10:00:00Z",
    ]);
  });
});
