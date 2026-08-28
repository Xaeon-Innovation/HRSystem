import type { FastifyPluginAsync } from "fastify";
import { eq } from "drizzle-orm";
import { users } from "@hr/db";
import { isUserId } from "../lib/avatar.js";

export const uploadRoutes: FastifyPluginAsync = async (app) => {
  app.get("/avatars/:userId", async (request, reply) => {
    const { userId } = request.params as { userId: string };
    if (!isUserId(userId)) {
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
    const buf = Buffer.from(user.avatarBytes, "base64");
    return reply
      .header("Content-Type", user.avatarMime)
      .header("Cache-Control", "private, max-age=3600")
      .header("Content-Length", String(buf.length))
      .send(buf);
  });
};
