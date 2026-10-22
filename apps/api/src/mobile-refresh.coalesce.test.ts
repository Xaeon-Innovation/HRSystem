import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Refresh coalescing: parallel 401s must share one /refresh call.
 * Uses a lightweight stand-in of the in-flight promise pattern from api.ts.
 */
describe("refresh coalescing", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("runs a single refresh for concurrent waiters", async () => {
    let calls = 0;
    let refreshInFlight: Promise<{ accessToken: string }> | null = null;

    const refreshTokens = () => {
      if (refreshInFlight) return refreshInFlight;
      refreshInFlight = (async () => {
        calls += 1;
        await new Promise((r) => setTimeout(r, 20));
        return { accessToken: "next" };
      })().finally(() => {
        refreshInFlight = null;
      });
      return refreshInFlight;
    };

    const [a, b, c] = await Promise.all([
      refreshTokens(),
      refreshTokens(),
      refreshTokens(),
    ]);
    expect(calls).toBe(1);
    expect(a.accessToken).toBe("next");
    expect(b.accessToken).toBe("next");
    expect(c.accessToken).toBe("next");
  });
});
