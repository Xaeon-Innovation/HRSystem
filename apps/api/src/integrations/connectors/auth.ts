import { createHmac, timingSafeEqual } from "node:crypto";
import type { IntegrationAuthConfig } from "@hr/db";
import { decryptJson } from "../crypto.js";

export function authHeaders(
  authType: string,
  encrypted: string | null,
): Record<string, string> {
  if (!encrypted || authType === "none") return {};
  const cfg = decryptJson<IntegrationAuthConfig>(encrypted);
  if (authType === "api_key") {
    const header = cfg.apiKeyHeader || cfg.headerName || "X-API-Key";
    return cfg.apiKey ? { [header]: cfg.apiKey } : {};
  }
  if (authType === "bearer") {
    return cfg.bearerToken ? { Authorization: `Bearer ${cfg.bearerToken}` } : {};
  }
  if (authType === "basic" && cfg.username && cfg.password) {
    const token = Buffer.from(`${cfg.username}:${cfg.password}`).toString("base64");
    return { Authorization: `Basic ${token}` };
  }
  return {};
}

export function verifyWebhookHmac(
  secret: string,
  rawBody: string,
  provided: string,
): boolean {
  if (!secret || !provided) return false;
  const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(digest, "utf8");
  const b = Buffer.from(provided.replace(/^sha256=/i, ""), "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
