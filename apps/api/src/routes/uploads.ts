import type { FastifyPluginAsync, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import { tenants, users } from "@hr/db";
import { isUuid } from "../lib/avatar.js";

function sendImage(reply: FastifyReply, mime: string, bytesB64: string) {
  const buf = Buffer.from(bytesB64, "base64");
  return reply
    .header("Content-Type", mime)
    .header("Cache-Control", "private, max-age=3600")
    .header("Content-Length", String(buf.length))
    .send(buf);
}

export const uploadRoutes: FastifyPluginAsync = async (app) => {
  app.get("/avatars/:userId", async (request, reply) => {
    const { userId } = request.params as { userId: string };
    if (!isUuid(userId)) {
      return reply.code(400).send({ error: "Invalid avatar id" });
    }
    const user = await app.db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        avatarMime: true,
        avatarBytes: true,
      },
    });
    if (!user?.avatarBytes || !user.avatarMime) {
      return reply.code(404).send({ error: "Not found" });
    }
    return sendImage(reply, user.avatarMime, user.avatarBytes);
  });

  app.get("/logos/:tenantId", async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    if (!isUuid(tenantId)) {
      return reply.code(400).send({ error: "Invalid logo id" });
    }
    const tenant = await app.db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
      columns: {
        logoMime: true,
        logoBytes: true,
      },
    });
    if (!tenant?.logoBytes || !tenant.logoMime) {
      return reply.code(404).send({ error: "Not found" });
    }
    return sendImage(reply, tenant.logoMime, tenant.logoBytes);
  });
};
