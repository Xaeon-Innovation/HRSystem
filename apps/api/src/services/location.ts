import { and, eq } from "drizzle-orm";
import { employeeLiveLocations, locationPings } from "@hr/db";
import type { App } from "../types.js";
import { broadcastToTenant } from "../ws-hub.js";

export type LocationPointInput = {
  tenantId: string;
  employeeId: string;
  lat: number;
  lng: number;
  recordedAt: Date;
  clientPingId?: string | null;
};

/** Insert a location ping row (same shape WS and clock paths use). */
export async function insertLocationPing(app: App, input: LocationPointInput) {
  await app.db.insert(locationPings).values({
    tenantId: input.tenantId,
    employeeId: input.employeeId,
    lat: input.lat,
    lng: input.lng,
    recordedAt: input.recordedAt,
    clientPingId: input.clientPingId ?? null,
  });
}

/** Upsert live location while clocked in. */
export async function upsertLiveLocationClockedIn(
  app: App,
  input: LocationPointInput,
) {
  await app.db
    .insert(employeeLiveLocations)
    .values({
      employeeId: input.employeeId,
      tenantId: input.tenantId,
      lat: input.lat,
      lng: input.lng,
      updatedAt: input.recordedAt,
      isClockedIn: true,
    })
    .onConflictDoUpdate({
      target: employeeLiveLocations.employeeId,
      set: {
        lat: input.lat,
        lng: input.lng,
        updatedAt: input.recordedAt,
        isClockedIn: true,
        tenantId: input.tenantId,
      },
    });
}

/** Mark live location clocked-out and update last position. */
export async function markLiveLocationClockedOut(
  app: App,
  input: LocationPointInput,
) {
  await app.db
    .update(employeeLiveLocations)
    .set({
      isClockedIn: false,
      lat: input.lat,
      lng: input.lng,
      updatedAt: input.recordedAt,
    })
    .where(
      and(
        eq(employeeLiveLocations.employeeId, input.employeeId),
        eq(employeeLiveLocations.tenantId, input.tenantId),
      ),
    );
}

export function broadcastLocationUpdate(
  tenantId: string,
  payload: {
    employeeId: string;
    lat: number;
    lng: number;
    updatedAt: string;
    isClockedIn: boolean;
  },
) {
  broadcastToTenant(tenantId, {
    type: "location.update",
    payload,
  });
}

/**
 * Record a ping + live location while on shift (WS / future batch).
 * Does not run compliance — callers that need it invoke shifts separately.
 */
export async function recordClockedInLocation(
  app: App,
  input: LocationPointInput,
) {
  await insertLocationPing(app, input);
  await upsertLiveLocationClockedIn(app, input);
}
