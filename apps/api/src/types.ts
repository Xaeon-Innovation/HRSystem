import type { Db } from "@hr/db";
import type { JwtPayload, Role, SystemModuleRole } from "@hr/shared";
import { hasSystemModuleRole } from "@hr/shared";
import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";

export type AppEnv = {
  jwtRefreshSecret: string;
};

declare module "fastify" {
  interface FastifyInstance {
    db: Db;
    env: AppEnv;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

export type AuthedRequest = FastifyRequest & {
  user: JwtPayload;
};

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ error: "Unauthorized" });
  }
}

export function requireRoles(...roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticate(request, reply);
    if (reply.sent) return;
    const user = request.user as JwtPayload;
    if (roles.includes(user.role)) return;
    // Super admin who entered a tenant workspace may use tenant_admin routes.
    if (
      user.role === "super_admin" &&
      user.tenantId &&
      roles.includes("tenant_admin")
    ) {
      return;
    }
    return reply.code(403).send({ error: "Forbidden" });
  };
}

/** Tenant admin, or an employee granted the given module control role. */
export function requireModuleRole(...modules: SystemModuleRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticate(request, reply);
    if (reply.sent) return;
    const user = request.user as JwtPayload;
    if (user.role === "tenant_admin") return;
    if (user.role === "super_admin" && user.tenantId) return;
    if (modules.some((module) => hasSystemModuleRole(user, module))) return;
    return reply.code(403).send({ error: "Forbidden" });
  };
}

export function requireTenantScope() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticate(request, reply);
    if (reply.sent) return;
    const user = request.user as JwtPayload;
    if (user.role === "super_admin" && !user.tenantId) {
      return reply
        .code(403)
        .send({
          error:
            "Enter a tenant workspace from Platform → Tenants to access product data",
        });
    }
    if (!user.tenantId) {
      return reply.code(401).send({ error: "Missing tenant scope" });
    }
  };
}

export function tenantIdOf(request: FastifyRequest): string {
  const user = request.user as JwtPayload;
  if (!user.tenantId) throw new Error("Missing tenantId");
  return user.tenantId;
}

export type App = FastifyInstance;
