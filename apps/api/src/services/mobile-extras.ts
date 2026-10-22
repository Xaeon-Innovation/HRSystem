import { and, eq, sql } from "drizzle-orm";
import {
  employeeLiveLocations,
  employees,
  mobileUploads,
  users,
} from "@hr/db";
import type { JwtPayload, MobileUploadRequest } from "@hr/shared";
import { moduleRolesOf, signTokens } from "../lib/auth-tokens.js";
import type { App } from "../types.js";

const STYLE_LIGHT =
  process.env.ELEVORA_MAP_STYLE_LIGHT ??
  "https://tiles.openfreemap.org/styles/liberty";
const STYLE_DARK =
  process.env.ELEVORA_MAP_STYLE_DARK ??
  "https://tiles.openfreemap.org/styles/dark";

export async function createMobileUpload(
  app: App,
  input: {
    tenantId: string;
    userId: string;
    body: MobileUploadRequest;
  },
) {
  const [row] = await app.db
    .insert(mobileUploads)
    .values({
      tenantId: input.tenantId,
      userId: input.userId,
      purpose: input.body.purpose,
      fileName: input.body.fileName,
      mime: input.body.mime,
      size: input.body.size,
      dataUrl: input.body.dataUrl,
    })
    .returning();
  return {
    uploadId: row.id,
    purpose: row.purpose,
    fileName: row.fileName,
    mime: row.mime,
    size: row.size,
  };
}

function bboxAround(
  lat: number,
  lng: number,
  radiusMeters: number,
): [[number, number], [number, number]] {
  const pad = Math.max(radiusMeters * 1.5, 500);
  const dLat = pad / 111_320;
  const dLng = pad / (111_320 * Math.cos((lat * Math.PI) / 180));
  return [
    [lng - dLng, lat - dLat],
    [lng + dLng, lat + dLat],
  ];
}

export async function mapRegionsForUser(
  app: App,
  input: { tenantId: string; user: JwtPayload },
) {
  const regions: Array<{
    id: string;
    name: string;
    bounds: [[number, number], [number, number]];
    minZoom: number;
    maxZoom: number;
  }> = [];

  if (input.user.employeeId) {
    const emp = await app.db.query.employees.findFirst({
      where: and(
        eq(employees.id, input.user.employeeId),
        eq(employees.tenantId, input.tenantId),
      ),
    });
    if (
      emp?.geofenceLat != null &&
      emp?.geofenceLng != null &&
      emp?.geofenceRadiusMeters != null
    ) {
      regions.push({
        id: `zone-${emp.id}`,
        name: "Work zone",
        bounds: bboxAround(
          emp.geofenceLat,
          emp.geofenceLng,
          emp.geofenceRadiusMeters,
        ),
        minZoom: 10,
        maxZoom: 16,
      });
    }

  }

  return {
    regions,
    styles: { light: STYLE_LIGHT, dark: STYLE_DARK },
  };
}

export async function teamPresence(
  app: App,
  input: { tenantId: string; user: JwtPayload },
) {
  const isAdmin = input.user.role === "tenant_admin";
  if (!isAdmin && !input.user.employeeId) {
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  }

  const reports = await app.db
    .select({
      employeeId: employees.id,
      name: users.name,
      presenceMode: employees.presenceMode,
      lat: employeeLiveLocations.lat,
      lng: employeeLiveLocations.lng,
      updatedAt: employeeLiveLocations.updatedAt,
      isClockedIn: employeeLiveLocations.isClockedIn,
    })
    .from(employees)
    .innerJoin(users, eq(users.id, employees.userId))
    .leftJoin(
      employeeLiveLocations,
      eq(employeeLiveLocations.employeeId, employees.id),
    )
    .where(
      and(
        eq(employees.tenantId, input.tenantId),
        eq(employees.status, "active"),
        isAdmin
          ? sql`true`
          : eq(employees.managerId, input.user.employeeId!),
      ),
    );

  return {
    members: reports.map((r) => ({
      employeeId: r.employeeId,
      name: r.name,
      presenceMode: r.presenceMode,
      lat: r.lat ?? null,
      lng: r.lng ?? null,
      updatedAt: r.updatedAt?.toISOString() ?? null,
      isClockedIn: r.isClockedIn ?? false,
    })),
    serverTime: new Date().toISOString(),
  };
}

/** Short-lived access JWT so the app can authenticate to `/ws`. */
export async function realtimeToken(
  app: App,
  user: JwtPayload,
): Promise<{ token: string; expiresInSec: number }> {
  const expiresInSec = 10 * 60;
  const dbUser = await app.db.query.users.findFirst({
    where: eq(users.id, user.sub),
  });
  if (!dbUser) {
    throw Object.assign(new Error("Not found"), { statusCode: 404 });
  }
  const { accessToken } = signTokens(app, {
    sub: user.sub,
    role: user.role,
    tenantId: user.tenantId,
    employeeId: user.employeeId ?? null,
    systemModuleRoles: moduleRolesOf(dbUser),
  });
  // Note: signTokens always uses 15m access TTL; document as upper bound.
  return { token: accessToken, expiresInSec };
}
