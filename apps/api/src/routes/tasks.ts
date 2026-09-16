import type { FastifyPluginAsync } from "fastify";
import type { ZodError } from "zod";
import {
  createTaskSchema,
  taskAttachmentInputSchema,
  taskDeliverableSubmitSchema,
  taskListQuerySchema,
  taskReviewSchema,
  updateTaskSchema,
  type JwtPayload,
} from "@hr/shared";
import {
  requireModuleRole,
  requireTenantScope,
  tenantIdOf,
} from "../types.js";
import { requirePlanFeature } from "../lib/features.js";
import {
  addTaskAttachment,
  cancelTask,
  completeTask,
  createTasks,
  getBatchSummary,
  getTaskDetail,
  listTasks,
  reviewTask,
  startTask,
  submitDeliverable,
  submitTaskForReview,
  updateTaskMeta,
} from "../services/tasks.js";

function zodErrorMessage(error: ZodError): string {
  const flat = error.flatten();
  const messages = [
    ...flat.formErrors,
    ...Object.values(flat.fieldErrors).flatMap((v) => v ?? []),
  ].filter((m): m is string => Boolean(m));
  return messages[0] ?? "Invalid request";
}

function httpError(err: unknown, reply: { code: (n: number) => { send: (b: unknown) => unknown } }) {
  const status =
    typeof err === "object" &&
    err &&
    "statusCode" in err &&
    typeof (err as { statusCode: unknown }).statusCode === "number"
      ? (err as { statusCode: number }).statusCode
      : 500;
  const message =
    err instanceof Error ? err.message : "Unexpected error";
  return reply.code(status).send({ error: message });
}

export const taskRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireTenantScope());
  app.addHook("preHandler", requirePlanFeature("tasks"));

  app.get("/", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const actor = request.user as JwtPayload;
    const parsed = taskListQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: zodErrorMessage(parsed.error) });
    }
    return listTasks(app, tenantId, actor, parsed.data);
  });

  app.get("/batches/:batchId", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const actor = request.user as JwtPayload;
    const { batchId } = request.params as { batchId: string };
    try {
      return await getBatchSummary(app, tenantId, batchId, actor);
    } catch (err) {
      return httpError(err, reply);
    }
  });

  app.get("/:id", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const actor = request.user as JwtPayload;
    const { id } = request.params as { id: string };
    try {
      return { task: await getTaskDetail(app, tenantId, id, actor) };
    } catch (err) {
      return httpError(err, reply);
    }
  });

  app.post(
    "/",
    { preHandler: requireModuleRole("tasks") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const actor = request.user as JwtPayload;
      const parsed = createTaskSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: zodErrorMessage(parsed.error) });
      }
      try {
        const result = await createTasks(app, tenantId, actor, parsed.data);
        return reply.code(201).send(result);
      } catch (err) {
        return httpError(err, reply);
      }
    },
  );

  app.patch(
    "/:id",
    { preHandler: requireModuleRole("tasks") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const actor = request.user as JwtPayload;
      const { id } = request.params as { id: string };
      const parsed = updateTaskSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: zodErrorMessage(parsed.error) });
      }
      try {
        return {
          task: await updateTaskMeta(app, tenantId, id, actor, parsed.data),
        };
      } catch (err) {
        return httpError(err, reply);
      }
    },
  );

  app.post("/:id/attachments", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const actor = request.user as JwtPayload;
    const { id } = request.params as { id: string };
    const parsed = taskAttachmentInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: zodErrorMessage(parsed.error) });
    }
    try {
      return {
        task: await addTaskAttachment(app, tenantId, id, actor, parsed.data),
      };
    } catch (err) {
      return httpError(err, reply);
    }
  });

  app.post("/:id/deliverables", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const actor = request.user as JwtPayload;
    const { id } = request.params as { id: string };
    const parsed = taskDeliverableSubmitSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: zodErrorMessage(parsed.error) });
    }
    try {
      return {
        task: await submitDeliverable(app, tenantId, id, actor, parsed.data),
      };
    } catch (err) {
      return httpError(err, reply);
    }
  });

  app.post("/:id/start", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const actor = request.user as JwtPayload;
    const { id } = request.params as { id: string };
    try {
      return { task: await startTask(app, tenantId, id, actor) };
    } catch (err) {
      return httpError(err, reply);
    }
  });

  app.post("/:id/complete", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const actor = request.user as JwtPayload;
    const { id } = request.params as { id: string };
    try {
      return { task: await completeTask(app, tenantId, id, actor) };
    } catch (err) {
      return httpError(err, reply);
    }
  });

  app.post("/:id/submit", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const actor = request.user as JwtPayload;
    const { id } = request.params as { id: string };
    try {
      return { task: await submitTaskForReview(app, tenantId, id, actor) };
    } catch (err) {
      return httpError(err, reply);
    }
  });

  app.post(
    "/:id/review",
    { preHandler: requireModuleRole("tasks") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const actor = request.user as JwtPayload;
      const { id } = request.params as { id: string };
      const parsed = taskReviewSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: zodErrorMessage(parsed.error) });
      }
      try {
        return {
          task: await reviewTask(app, tenantId, id, actor, parsed.data),
        };
      } catch (err) {
        return httpError(err, reply);
      }
    },
  );

  app.post(
    "/:id/cancel",
    { preHandler: requireModuleRole("tasks") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const actor = request.user as JwtPayload;
      const { id } = request.params as { id: string };
      const q = request.query as { batch?: string };
      const cancelBatch = q.batch === "true" || q.batch === "1";
      try {
        return await cancelTask(app, tenantId, id, actor, cancelBatch);
      } catch (err) {
        return httpError(err, reply);
      }
    },
  );
};
