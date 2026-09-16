import { and, eq } from "drizzle-orm";
import { integrationConnections } from "@hr/db";
import type { FastifyPluginAsync } from "fastify";
import {
  applyOAuthTokensToConnection,
  exchangeOAuthCode,
  verifyOAuthState,
  webAppBaseUrl,
} from "../integrations/connectors/oauth2.js";
import { getConnectorPack } from "../integrations/presets/registry.js";

/**
 * Public OAuth callback (provider redirect). No JWT — state is HMAC-signed.
 */
export const integrationOAuthCallbackRoutes: FastifyPluginAsync = async (
  app,
) => {
  app.get("/callback", async (request, reply) => {
    const query = request.query as {
      code?: string;
      state?: string;
      error?: string;
      error_description?: string;
    };
    const webBase = webAppBaseUrl();

    if (query.error) {
      const msg = encodeURIComponent(
        query.error_description || query.error || "OAuth denied",
      );
      return reply.redirect(`${webBase}/app/integrations?oauthError=${msg}`);
    }

    if (!query.code || !query.state) {
      return reply.redirect(
        `${webBase}/app/integrations?oauthError=${encodeURIComponent("Missing OAuth code or state")}`,
      );
    }

    const verified = verifyOAuthState(query.state);
    if (!verified) {
      return reply.redirect(
        `${webBase}/app/integrations?oauthError=${encodeURIComponent("Invalid or expired OAuth state")}`,
      );
    }

    const pack = getConnectorPack(verified.preset);
    if (!pack?.oauth) {
      return reply.redirect(
        `${webBase}/app/integrations?oauthError=${encodeURIComponent("Unknown connector pack")}`,
      );
    }

    const connection = await app.db.query.integrationConnections.findFirst({
      where: and(
        eq(integrationConnections.id, verified.connectionId),
        eq(integrationConnections.tenantId, verified.tenantId),
      ),
    });
    if (!connection) {
      return reply.redirect(
        `${webBase}/app/integrations?oauthError=${encodeURIComponent("Connection not found")}`,
      );
    }

    try {
      const tokens = await exchangeOAuthCode(pack, query.code);
      await applyOAuthTokensToConnection(app.db, connection, tokens);
      return reply.redirect(
        `${webBase}/app/integrations/${connection.id}?oauth=connected`,
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "OAuth token exchange failed";
      await app.db
        .update(integrationConnections)
        .set({
          lastError: message,
          status: "error",
          updatedAt: new Date(),
        })
        .where(eq(integrationConnections.id, connection.id));
      return reply.redirect(
        `${webBase}/app/integrations?oauthError=${encodeURIComponent(message)}`,
      );
    }
  });
};
