import type { FastifyPluginAsync } from "fastify";
import {
  mobileLocationsBatchSchema,
  mobileSyncPushBodySchema,
  mobileUploadRequestSchema,
  type JwtPayload,
} from "@hr/shared";
import { authenticate, tenantIdOf } from "../types.js";
import { buildMobileMe } from "../services/mobile-auth.js";
import {
  createMobileUpload,
  mapRegionsForUser,
  realtimeToken,
  teamPresence,
} from "../services/mobile-extras.js";
import {
  locationsBatch,
  syncPull,
  syncPush,
} from "../services/mobile-sync.js";

/** Additive `/v1/mobile/*` surface (auth is under `/v1/mobile/auth`). */
export const mobileRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", authenticate);

  app.get("/me", async (request, reply) => {
    const user = request.user as JwtPayload;
    if (!user.tenantId) {
      return reply.code(400).send({ error: "No tenant" });
    }
    const me = await buildMobileMe(app, user.sub, user.tenantId);
    if (!me) {
      return reply.code(404).send({ error: "Not found" });
    }
    return me;
  });

  app.get("/sync/pull", async (request, reply) => {
    const user = request.user as JwtPayload;
    const tenantId = tenantIdOf(request);
    const q = request.query as { cursor?: string; scopes?: string };
    try {
      return await syncPull(app, {
        tenantId,
        user,
        cursor: q.cursor,
      });
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: "sync_pull_failed" });
    }
  });

  app.post("/sync/push", async (request, reply) => {
    const user = request.user as JwtPayload;
    const tenantId = tenantIdOf(request);
    const parsed = mobileSyncPushBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const deviceId =
      typeof (request.headers["x-device-id"] as string | undefined) === "string"
        ? (request.headers["x-device-id"] as string)
        : null;
    return syncPush(app, {
      tenantId,
      user,
      deviceId,
      events: parsed.data.events,
    });
  });

  app.post("/locations/batch", async (request, reply) => {
    const user = request.user as JwtPayload;
    const tenantId = tenantIdOf(request);
    const parsed = mobileLocationsBatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    try {
      return await locationsBatch(app, {
        tenantId,
        user,
        body: parsed.data,
      });
    } catch (err) {
      const status =
        typeof err === "object" &&
        err &&
        "statusCode" in err &&
        typeof (err as { statusCode: unknown }).statusCode === "number"
          ? (err as { statusCode: number }).statusCode
          : 500;
      return reply
        .code(status)
        .send({ error: err instanceof Error ? err.message : "batch_failed" });
    }
  });

  app.post("/uploads", async (request, reply) => {
    const user = request.user as JwtPayload;
    const tenantId = tenantIdOf(request);
    const parsed = mobileUploadRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const uploaded = await createMobileUpload(app, {
      tenantId,
      userId: user.sub,
      body: parsed.data,
    });
    return reply.code(201).send(uploaded);
  });

  app.get("/map/regions", async (request) => {
    const user = request.user as JwtPayload;
    const tenantId = tenantIdOf(request);
    return mapRegionsForUser(app, { tenantId, user });
  });

  app.get("/team/presence", async (request, reply) => {
    const user = request.user as JwtPayload;
    const tenantId = tenantIdOf(request);
    try {
      return await teamPresence(app, { tenantId, user });
    } catch (err) {
      const status =
        typeof err === "object" &&
        err &&
        "statusCode" in err &&
        typeof (err as { statusCode: unknown }).statusCode === "number"
          ? (err as { statusCode: number }).statusCode
          : 500;
      return reply
        .code(status)
        .send({ error: err instanceof Error ? err.message : "forbidden" });
    }
  });

  app.get("/realtime/token", async (request, reply) => {
    const user = request.user as JwtPayload;
    try {
      return await realtimeToken(app, user);
    } catch (err) {
      const status =
        typeof err === "object" &&
        err &&
        "statusCode" in err &&
        typeof (err as { statusCode: unknown }).statusCode === "number"
          ? (err as { statusCode: number }).statusCode
          : 500;
      return reply
        .code(status)
        .send({ error: err instanceof Error ? err.message : "token_failed" });
    }
  });
};
