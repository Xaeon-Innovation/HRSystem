import { describe, expect, it } from "vitest";
import { openSecret, sealSecret } from "./secret-box.js";

describe("secret-box", () => {
  it("round-trips a login password", () => {
    const sealed = sealSecret("Employee123!");
    expect(sealed).not.toContain("Employee123!");
    expect(openSecret(sealed)).toBe("Employee123!");
  });

  it("returns null for missing or garbage payloads", () => {
    expect(openSecret(null)).toBeNull();
    expect(openSecret("not-valid-cipher")).toBeNull();
  });
});
