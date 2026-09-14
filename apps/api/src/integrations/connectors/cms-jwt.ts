import type { IntegrationAuthConfig, IntegrationConnectorConfig, Db } from "@hr/db";
import { eq } from "drizzle-orm";
import { integrationConnections } from "@hr/db";
import { decryptJson, encryptJson } from "../crypto.js";
import { readLimitedJson, safeFetch } from "../ssrf.js";

type Connection = typeof integrationConnections.$inferSelect;

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

export function parseExpiresIn(expiresIn: string | undefined): Date {
  const fallbackMs = 23 * 60 * 60 * 1000;
  if (!expiresIn) return new Date(Date.now() + fallbackMs);
  const match = /^(\d+)([smhd])$/i.exec(expiresIn.trim());
  if (!match) return new Date(Date.now() + fallbackMs);
  const n = Number(match[1]);
  const unit = match[2].toLowerCase();
  const mult =
    unit === "s" ? 1000 : unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000;
  // Refresh a bit before true expiry
  return new Date(Date.now() + Math.max(n * mult - 5 * 60_000, 60_000));
}

type TokenPair = {
  accessToken: string;
  refreshToken: string;
  expiresIn?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function extractTokens(body: unknown): TokenPair {
  const root = asRecord(body);
  const data = asRecord(root?.data) ?? root;
  const accessToken =
    typeof data?.accessToken === "string" ? data.accessToken : null;
  const refreshToken =
    typeof data?.refreshToken === "string" ? data.refreshToken : null;
  if (!accessToken || !refreshToken) {
    const message =
      typeof root?.message === "string" ? root.message : "CMS auth response missing tokens";
    throw new Error(message);
  }
  return {
    accessToken,
    refreshToken,
    expiresIn: typeof data?.expiresIn === "string" ? data.expiresIn : undefined,
  };
}

export async function loginCms(
  baseUrl: string,
  phone: string,
  password: string,
): Promise<TokenPair> {
  const url = joinUrl(baseUrl, "/auth/login");
  const res = await safeFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ phone, password }),
  });
  const body = await readLimitedJson(res);
  if (!res.ok) {
    const root = asRecord(body);
    const message =
      typeof root?.message === "string"
        ? root.message
        : `CMS login failed (HTTP ${res.status})`;
    throw new Error(message);
  }
  return extractTokens(body);
}

export async function refreshCms(
  baseUrl: string,
  refreshToken: string,
): Promise<TokenPair> {
  const url = joinUrl(baseUrl, "/auth/refresh-token");
  const res = await safeFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  const body = await readLimitedJson(res);
  if (!res.ok) {
    const root = asRecord(body);
    const message =
      typeof root?.message === "string"
        ? root.message
        : `CMS token refresh failed (HTTP ${res.status})`;
    throw new Error(message);
  }
  return extractTokens(body);
}

function readAuth(connection: Connection): IntegrationAuthConfig {
  if (!connection.authConfigEncrypted) return {};
  return decryptJson<IntegrationAuthConfig>(connection.authConfigEncrypted);
}

function tokenStillValid(cfg: IntegrationAuthConfig): boolean {
  if (!cfg.bearerToken || !cfg.tokenExpiresAt) return false;
  const expires = Date.parse(cfg.tokenExpiresAt);
  if (!Number.isFinite(expires)) return false;
  return expires > Date.now() + 2 * 60_000;
}

async function persistTokens(
  db: Db,
  connection: Connection,
  cfg: IntegrationAuthConfig,
  tokens: TokenPair,
): Promise<Connection> {
  const next: IntegrationAuthConfig = {
    ...cfg,
    bearerToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    tokenExpiresAt: parseExpiresIn(tokens.expiresIn).toISOString(),
  };
  const [updated] = await db
    .update(integrationConnections)
    .set({
      authType: "bearer",
      authConfigEncrypted: encryptJson(next),
      updatedAt: new Date(),
      lastError: null,
    })
    .where(eq(integrationConnections.id, connection.id))
    .returning();
  return updated;
}

export function isCmsJwtConnection(connection: Connection): boolean {
  const config = (connection.connectorConfig ?? {}) as IntegrationConnectorConfig;
  return config.authStrategy === "cms_jwt";
}

/**
 * Ensures a valid CMS Bearer token is stored on the connection.
 * Uses refresh when possible; falls back to phone/password login.
 */
export async function ensureCmsAccessToken(
  db: Db,
  connection: Connection,
): Promise<Connection> {
  if (!isCmsJwtConnection(connection)) return connection;
  if (!connection.baseUrl) {
    throw new Error("CMS base URL is required");
  }

  const cfg = readAuth(connection);
  if (tokenStillValid(cfg)) return connection;

  const phone = cfg.username?.trim();
  const password = cfg.password;

  try {
    if (cfg.refreshToken) {
      try {
        const tokens = await refreshCms(connection.baseUrl, cfg.refreshToken);
        return await persistTokens(db, connection, cfg, tokens);
      } catch {
        // fall through to login
      }
    }

    if (!phone || !password) {
      throw new Error(
        "CMS credentials missing, enter the service account phone and password",
      );
    }
    const tokens = await loginCms(connection.baseUrl, phone, password);
    return await persistTokens(db, connection, cfg, tokens);
  } catch (err) {
    const message = err instanceof Error ? err.message : "CMS authentication failed";
    await db
      .update(integrationConnections)
      .set({
        lastError: message,
        status: "error",
        updatedAt: new Date(),
      })
      .where(eq(integrationConnections.id, connection.id));
    throw new Error(
      message.includes("login") || message.includes("refresh") || message.includes("CMS")
        ? message
        : `CMS login failed, check phone/password (${message})`,
    );
  }
}
