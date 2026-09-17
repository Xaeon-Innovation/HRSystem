import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyWebhookHmac } from "./integrations/connectors/auth.js";

describe("integration webhook HMAC policy", () => {
  it("rejects empty provided signatures", () => {
    expect(verifyWebhookHmac("secret", "{}", "")).toBe(false);
    expect(verifyWebhookHmac("secret", "{}", "sha256=deadbeef")).toBe(false);
  });

  it("accepts a matching hex digest", () => {
    const body = '{"ok":true}';
    const digest = createHmac("sha256", "secret").update(body).digest("hex");
    expect(verifyWebhookHmac("secret", body, digest)).toBe(true);
    expect(verifyWebhookHmac("secret", body, `sha256=${digest}`)).toBe(true);
  });
});
