import { describe, expect, it, beforeEach } from "vitest";
import { createLoginGuard } from "./login-guard.js";

describe("loginGuard", () => {
  let now = 1_000_000;
  const guard = createLoginGuard({
    maxFailures: 3,
    lockoutMs: 60_000,
    now: () => now,
  });

  beforeEach(() => {
    now = 1_000_000;
    guard._reset();
  });

  it("locks after maxFailures and clears after lockout window", () => {
    expect(guard.isLocked("a@b.com", "cms")).toBe(false);
    guard.recordFailure("a@b.com", "cms");
    guard.recordFailure("a@b.com", "cms");
    expect(guard.recordFailure("a@b.com", "cms")).toEqual({
      locked: true,
      failures: 3,
    });
    expect(guard.isLocked("a@b.com", "cms")).toBe(true);
    expect(guard.remainingLockMs("a@b.com", "cms")).toBe(60_000);

    now += 60_001;
    expect(guard.isLocked("a@b.com", "cms")).toBe(false);
  });

  it("scopes lockouts by tenant slug and clears on success path", () => {
    guard.recordFailure("a@b.com", "cms");
    guard.recordFailure("a@b.com", "cms");
    guard.recordFailure("a@b.com", "cms");
    expect(guard.isLocked("a@b.com", "other")).toBe(false);
    guard.clear("a@b.com", "cms");
    expect(guard.isLocked("a@b.com", "cms")).toBe(false);
  });
});
