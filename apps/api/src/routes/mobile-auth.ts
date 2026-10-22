import type { FastifyPluginAsync } from "fastify";
import {
  mobileChangePasswordSchema,
  mobileLoginRequestSchema,
  mobileLogoutRequestSchema,
  mobileRefreshRequestSchema,
  mobileWorkspaceRequestSchema,
  type JwtPayload,
} from "@hr/shared";
import { authenticate } from "../types.js";
import {
  lookupWorkspace,
  mobileChangePassword,
  mobileLogin,
  mobileLogout,
  mobileRefresh,
} from "../services/mobile-auth.js";

export const mobileAuthRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/workspace",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
    },
    async (request, reply) => {
      const parsed = mobileWorkspaceRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const workspace = await lookupWorkspace(app, parsed.data.slug.trim());
      if (!workspace) {
        return reply.code(404).send({ error: "Workspace not found" });
      }
      return workspace;
    },
  );

  app.post(
    "/login",
    {
      config: {
        rateLimit: { max: 20, timeWindow: "1 minute" },
      },
    },
    async (request, reply) => {
      const parsed = mobileLoginRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const body = {
        ...parsed.data,
        email: parsed.data.email.trim().toLowerCase(),
        slug: parsed.data.slug.trim(),
      };
      const result = await mobileLogin(app, body);
      if (!result.ok) {
        return reply.code(result.status).send({ error: result.error });
      }
      return {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        mustChangePassword: result.mustChangePassword,
        me: result.me,
      };
    },
  );

  app.post("/refresh", async (request, reply) => {
    const parsed = mobileRefreshRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const result = await mobileRefresh(app, parsed.data);
    if (!result.ok) {
      return reply.code(result.status).send({ error: result.error });
    }
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  });

  app.post(
    "/change-password",
    { preHandler: authenticate },
    async (request, reply) => {
      const parsed = mobileChangePasswordSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const user = request.user as JwtPayload;
      const result = await mobileChangePassword(app, {
        userId: user.sub,
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
      });
      if (!result.ok) {
        return reply.code(result.status).send({ error: result.error });
      }
      return { ok: true };
    },
  );

  app.post("/logout", { preHandler: authenticate }, async (request, reply) => {
    const parsed = mobileLogoutRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    await mobileLogout(app, parsed.data);
    return { ok: true };
  });
};
