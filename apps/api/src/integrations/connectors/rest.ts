import type { IntegrationConnectorConfig, integrationConnections } from "@hr/db";
import { extractItems, getPath, hashExternalId } from "../mapper.js";
import { readLimitedJson, safeFetch } from "../ssrf.js";
import { authHeaders } from "./auth.js";

type Connection = typeof integrationConnections.$inferSelect;

function joinUrl(base: string, path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

export async function testRestFetch(connection: Connection): Promise<{
  ok: boolean;
  status?: number;
  sample?: unknown;
  error?: string;
}> {
  try {
    if (!connection.baseUrl) return { ok: false, error: "baseUrl required" };
    const config = connection.connectorConfig ?? {};
    const entity = config.entities?.[0];
    const path = entity?.path ?? "/";
    const url = joinUrl(connection.baseUrl, path);
    const headers = authHeaders(connection.authType, connection.authConfigEncrypted);
    const res = await safeFetch(url, { method: entity?.method ?? "GET", headers });
    const body = await readLimitedJson(res);
    const items = extractItems(body, entity?.itemsPath);
    return {
      ok: res.ok,
      status: res.status,
      sample: items[0] ?? body,
      error: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "fetch failed" };
  }
}

export async function pollRestConnection(
  connection: Connection,
  cursor: Record<string, unknown>,
): Promise<{
  records: Array<{
    sourceEventType: string;
    externalRecordId: string;
    payload: Record<string, unknown>;
  }>;
  nextCursor: Record<string, unknown>;
}> {
  if (!connection.baseUrl) {
    throw new Error("baseUrl required for polling");
  }
  const config: IntegrationConnectorConfig = connection.connectorConfig ?? {};
  const records: Array<{
    sourceEventType: string;
    externalRecordId: string;
    payload: Record<string, unknown>;
  }> = [];
  const nextCursor: Record<string, unknown> = { ...cursor };
  const headers = authHeaders(connection.authType, connection.authConfigEncrypted);

  for (const entity of config.entities ?? []) {
    const url = new URL(joinUrl(connection.baseUrl, entity.path));
    const pagination = config.pagination ?? { type: "none" };
    if (pagination.type === "page") {
      const page = Number(cursor[`${entity.sourceEntity}_page`] ?? 1);
      url.searchParams.set(pagination.pageParam ?? "page", String(page));
    } else if (pagination.type === "cursor") {
      const token = cursor[`${entity.sourceEntity}_cursor`];
      if (typeof token === "string" && token) {
        url.searchParams.set(pagination.cursorParam ?? "cursor", token);
      }
    }
    const updatedField = entity.updatedAtField;
    const since = cursor[`${entity.sourceEntity}_since`];
    if (updatedField && typeof since === "string") {
      url.searchParams.set("updated_since", since);
    }

    const res = await safeFetch(url.toString(), {
      method: entity.method ?? "GET",
      headers,
    });
    if (!res.ok) {
      throw new Error(`Poll ${entity.sourceEntity} failed: HTTP ${res.status}`);
    }
    const body = await readLimitedJson(res);
    const items = extractItems(body, entity.itemsPath);
    const idField = entity.idField ?? "id";
    for (const item of items) {
      const payload =
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : { value: item };
      const externalRecordId = String(getPath(payload, idField) ?? hashExternalId(payload));
      records.push({
        sourceEventType: entity.eventType ?? entity.sourceEntity,
        externalRecordId,
        payload,
      });
    }
    if (pagination.type === "page") {
      const page = Number(cursor[`${entity.sourceEntity}_page`] ?? 1);
      nextCursor[`${entity.sourceEntity}_page`] = items.length ? page + 1 : page;
    } else if (pagination.type === "cursor") {
      const token = getPath(body, pagination.cursorPath ?? "next_cursor");
      if (typeof token === "string") {
        nextCursor[`${entity.sourceEntity}_cursor`] = token;
      }
    }
    nextCursor[`${entity.sourceEntity}_since`] = new Date().toISOString();
  }

  return { records, nextCursor };
}
