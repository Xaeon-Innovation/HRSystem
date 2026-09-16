import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  integrationConnections,
  type Db,
  type IntegrationAuthConfig,
  type IntegrationConnectorConfig,
} from "@hr/db";
import { decryptJson, encryptJson } from "../crypto.js";
import { readLimitedJson, safeFetch } from "../ssrf.js";
import type { ConnectorPack } from "../presets/registry.js";

type Connection = typeof integrationConnections.$inferSelect;

type OAuthTokenResponse = {
  accessToken: string;
  refreshToken?: string;
  expiresInSeconds?: number;
};

function oauthStateSecret(): string {
  return (
    process.env.INTEGRATION_SECRETS_KEY?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    "dev-oauth-state-secret"
  );
}

export function publicApiBaseUrl(): string {
  return (
    process.env.API_PUBLIC_URL?.trim() ||
    `http://localhost:${process.env.API_PORT ?? 4000}`
  ).replace(/\/$/, "");
}

export function webAppBaseUrl(): string {
  return (
    process.env.WEB_APP_URL?.trim() ||
    process.env.CORS_ORIGIN?.trim() ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function oauthCallbackUrl(): string {
  return `${publicApiBaseUrl()}/v1/integrations/oauth/callback`;
}

export function signOAuthState(payload: {
  connectionId: string;
  tenantId: string;
  preset: string;
  exp: number;
}): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", oauthStateSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

export function verifyOAuthState(state: string): {
  connectionId: string;
  tenantId: string;
  preset: string;
} | null {
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", oauthStateSecret())
    .update(body)
    .digest("base64url");
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as {
      connectionId?: string;
      tenantId?: string;
      preset?: string;
      exp?: number;
    };
    if (
      !parsed.connectionId ||
      !parsed.tenantId ||
      !parsed.preset ||
      typeof parsed.exp !== "number" ||
      parsed.exp < Date.now()
    ) {
      return null;
    }
    return {
      connectionId: parsed.connectionId,
      tenantId: parsed.tenantId,
      preset: parsed.preset,
    };
  } catch {
    return null;
  }
}

export function buildAuthorizeUrl(
  pack: ConnectorPack,
  state: string,
): string {
  if (!pack.oauth) throw new Error("Pack does not support OAuth");
  const clientId = process.env[pack.oauth.clientIdEnv]?.trim();
  if (!clientId) throw new Error("OAuth client id is not configured");
  const url = new URL(pack.oauth.authorizeUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", oauthCallbackUrl());
  url.searchParams.set("scope", pack.oauth.scopes.join(" "));
  url.searchParams.set("state", state);
  return url.toString();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function extractOAuthTokens(body: unknown): OAuthTokenResponse {
  const root = asRecord(body);
  const accessToken =
    typeof root?.access_token === "string"
      ? root.access_token
      : typeof root?.accessToken === "string"
        ? root.accessToken
        : null;
  if (!accessToken) {
    throw new Error("OAuth token response missing access_token");
  }
  const refreshToken =
    typeof root?.refresh_token === "string"
      ? root.refresh_token
      : typeof root?.refreshToken === "string"
        ? root.refreshToken
        : undefined;
  const expiresInRaw = root?.expires_in ?? root?.expiresIn;
  const expiresInSeconds =
    typeof expiresInRaw === "number"
      ? expiresInRaw
      : typeof expiresInRaw === "string"
        ? Number(expiresInRaw)
        : undefined;
  return {
    accessToken,
    refreshToken,
    expiresInSeconds: Number.isFinite(expiresInSeconds)
      ? expiresInSeconds
      : undefined,
  };
}

function tokenExpiresAtIso(expiresInSeconds?: number): string {
  const sec =
    typeof expiresInSeconds === "number" && expiresInSeconds > 0
      ? expiresInSeconds
      : 6 * 60 * 60;
  // Refresh a bit before true expiry
  return new Date(
    Date.now() + Math.max(sec * 1000 - 5 * 60_000, 60_000),
  ).toISOString();
}

export async function exchangeOAuthCode(
  pack: ConnectorPack,
  code: string,
): Promise<OAuthTokenResponse> {
  if (!pack.oauth) throw new Error("Pack does not support OAuth");
  const clientId = process.env[pack.oauth.clientIdEnv]?.trim();
  const clientSecret = process.env[pack.oauth.clientSecretEnv]?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("OAuth client credentials are not configured");
  }
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: oauthCallbackUrl(),
    code,
  });
  const res = await safeFetch(pack.oauth.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });
  const json = await readLimitedJson(res);
  if (!res.ok) {
    const root = asRecord(json);
    const message =
      typeof root?.message === "string"
        ? root.message
        : typeof root?.error_description === "string"
          ? root.error_description
          : `OAuth token exchange failed (HTTP ${res.status})`;
    throw new Error(message);
  }
  return extractOAuthTokens(json);
}

export async function refreshOAuthToken(
  pack: ConnectorPack,
  refreshToken: string,
): Promise<OAuthTokenResponse> {
  if (!pack.oauth) throw new Error("Pack does not support OAuth");
  const clientId = process.env[pack.oauth.clientIdEnv]?.trim();
  const clientSecret = process.env[pack.oauth.clientSecretEnv]?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("OAuth client credentials are not configured");
  }
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });
  const res = await safeFetch(pack.oauth.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });
  const json = await readLimitedJson(res);
  if (!res.ok) {
    const root = asRecord(json);
    const message =
      typeof root?.message === "string"
        ? root.message
        : typeof root?.error_description === "string"
          ? root.error_description
          : `OAuth refresh failed (HTTP ${res.status})`;
    throw new Error(message);
  }
  return extractOAuthTokens(json);
}

export function isOAuth2Connection(connection: Connection): boolean {
  const config = (connection.connectorConfig ?? {}) as IntegrationConnectorConfig;
  return (
    config.authStrategy === "oauth2" ||
    connection.authType === "oauth2"
  );
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
  tokens: OAuthTokenResponse,
): Promise<Connection> {
  const next: IntegrationAuthConfig = {
    ...cfg,
    bearerToken: tokens.accessToken,
    refreshToken: tokens.refreshToken ?? cfg.refreshToken,
    tokenExpiresAt: tokenExpiresAtIso(tokens.expiresInSeconds),
  };
  const [updated] = await db
    .update(integrationConnections)
    .set({
      authType: "oauth2",
      authConfigEncrypted: encryptJson(next),
      updatedAt: new Date(),
      lastError: null,
      status: "active",
    })
    .where(eq(integrationConnections.id, connection.id))
    .returning();
  return updated;
}

/**
 * Ensures a valid OAuth access token is stored on the connection.
 */
export async function ensureOAuthAccessToken(
  db: Db,
  connection: Connection,
  pack: ConnectorPack,
): Promise<Connection> {
  if (!isOAuth2Connection(connection)) return connection;
  const cfg = readAuth(connection);
  if (tokenStillValid(cfg)) return connection;
  if (!cfg.refreshToken) {
    throw new Error("OAuth refresh token missing; reconnect the integration");
  }
  try {
    const tokens = await refreshOAuthToken(pack, cfg.refreshToken);
    return await persistTokens(db, connection, cfg, tokens);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "OAuth authentication failed";
    await db
      .update(integrationConnections)
      .set({
        lastError: message,
        status: "error",
        updatedAt: new Date(),
      })
      .where(eq(integrationConnections.id, connection.id));
    throw new Error(message);
  }
}

export async function applyOAuthTokensToConnection(
  db: Db,
  connection: Connection,
  tokens: OAuthTokenResponse,
): Promise<Connection> {
  const cfg = readAuth(connection);
  return persistTokens(db, connection, cfg, tokens);
}
