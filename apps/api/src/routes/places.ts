import type { FastifyPluginAsync } from "fastify";
import { requireRoles } from "../types.js";
import { requireActiveSubscription } from "../lib/features.js";

type NominatimItem = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  class?: string;
  name?: string;
  address?: Record<string, string>;
};

export const placesRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireActiveSubscription());
  app.addHook("preHandler", requireRoles("tenant_admin"));

  app.get("/places/search", async (request, reply) => {
    const query = request.query as {
      q?: string;
      limit?: string;
      nearLat?: string;
      nearLng?: string;
    };
    const q = query.q?.trim() ?? "";
    const limit = Math.min(10, Math.max(1, Number(query.limit) || 8));
    const nearLat = query.nearLat != null ? Number(query.nearLat) : NaN;
    const nearLng = query.nearLng != null ? Number(query.nearLng) : NaN;

    if (q.length < 2) {
      return reply.code(400).send({ error: "Query must be at least 2 characters" });
    }

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", q);
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", String(limit));
    if (
      Number.isFinite(nearLat) &&
      Number.isFinite(nearLng) &&
      nearLat >= -90 &&
      nearLat <= 90 &&
      nearLng >= -180 &&
      nearLng <= 180
    ) {
      // ~0.35° ~ 35–40km box around the employee / map focus
      const d = 0.35;
      url.searchParams.set(
        "viewbox",
        `${nearLng - d},${nearLat + d},${nearLng + d},${nearLat - d}`,
      );
      url.searchParams.set("bounded", "0");
    }

    let upstream: Response;
    try {
      upstream = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          "User-Agent": "HR-Track/1.0 (tenant-admin place search for work zones)",
        },
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      return reply.code(502).send({ error: "Place search unavailable" });
    }

    if (!upstream.ok) {
      return reply
        .code(502)
        .send({ error: `Place search failed (${upstream.status})` });
    }

    const raw = (await upstream.json()) as NominatimItem[];
    const places = raw.map((item) => {
      const name =
        item.name ||
        item.address?.amenity ||
        item.address?.building ||
        item.address?.tourism ||
        item.address?.shop ||
        item.display_name.split(",")[0]?.trim() ||
        "Place";
      return {
        id: String(item.place_id),
        name,
        label: item.display_name,
        lat: Number(item.lat),
        lng: Number(item.lon),
        type: item.type ?? item.class ?? null,
      };
    });

    return { places };
  });
};
