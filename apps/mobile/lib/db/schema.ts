import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Local mirror of sync entities + outbox (M5). */

export const syncState = sqliteTable("sync_state", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const outbox = sqliteTable("outbox", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  payloadJson: text("payload_json").notNull(),
  occurredAt: text("occurred_at").notNull(),
  aggregateKey: text("aggregate_key").notNull(),
  baseVersion: integer("base_version"),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  status: text("status").notNull().default("pending"), // pending | sending | applied | rejected | conflict
  createdAt: text("created_at").notNull(),
});

export const locationPoints = sqliteTable("location_points", {
  id: text("id").primaryKey(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  accuracyM: real("accuracy_m").notNull(),
  recordedAt: text("recorded_at").notNull(),
  sent: integer("sent").notNull().default(0),
});

export const shiftInstances = sqliteTable("shift_instances", {
  id: text("id").primaryKey(),
  version: integer("version").notNull().default(1),
  deleted: integer("deleted").notNull().default(0),
  json: text("json").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const clockSessions = sqliteTable("clock_sessions", {
  id: text("id").primaryKey(),
  version: integer("version").notNull().default(1),
  deleted: integer("deleted").notNull().default(0),
  json: text("json").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const leaveRequests = sqliteTable("leave_requests", {
  id: text("id").primaryKey(),
  version: integer("version").notNull().default(1),
  deleted: integer("deleted").notNull().default(0),
  json: text("json").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  version: integer("version").notNull().default(1),
  deleted: integer("deleted").notNull().default(0),
  json: text("json").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  version: integer("version").notNull().default(1),
  deleted: integer("deleted").notNull().default(0),
  json: text("json").notNull(),
  updatedAt: text("updated_at").notNull(),
});
