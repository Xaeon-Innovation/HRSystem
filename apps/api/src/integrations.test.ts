import { describe, expect, it } from "vitest";
import { decryptJson, encryptJson, maskSecret } from "../src/integrations/crypto.js";

describe("integration secret encryption", () => {
  it("round-trips JSON payloads", () => {
    const payload = { apiKey: "secret-123", headerName: "X-API-Key" };
    const encrypted = encryptJson(payload);
    expect(encrypted).not.toContain("secret-123");
    expect(decryptJson(encrypted)).toEqual(payload);
  });

  it("masks secrets in UI logs", () => {
    expect(maskSecret("abcd1234")).toBe("ab••••34");
    expect(maskSecret(null)).toBeNull();
  });
});
