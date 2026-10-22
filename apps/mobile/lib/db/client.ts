import { Platform } from "react-native";
import type { ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import * as schema from "./schema";

type ExpoDb = ReturnType<typeof import("expo-sqlite").openDatabaseSync>;

/**
 * expo-sqlite web needs SharedArrayBuffer (COOP/COEP). Edge/dev without those
 * headers cannot open a DB — keep SQLite native-only for now.
 */
export const isLocalDbAvailable =
  Platform.OS !== "web" && typeof SharedArrayBuffer !== "undefined";

let expoDb: ExpoDb | null = null;
let drizzleDb: ExpoSQLiteDatabase<typeof schema> | null = null;

function openNative() {
  if (!isLocalDbAvailable) {
    throw new Error("Local SQLite is not available in this browser");
  }
  if (!expoDb) {
    // Lazy require so web never runs openDatabaseSync at module load.
    const { openDatabaseSync } = require("expo-sqlite") as typeof import("expo-sqlite");
    const { drizzle } = require("drizzle-orm/expo-sqlite") as typeof import("drizzle-orm/expo-sqlite");
    expoDb = openDatabaseSync("elevora-field.db");
    drizzleDb = drizzle(expoDb, { schema });
  }
  return { expoDb, drizzleDb: drizzleDb! };
}

/** Drizzle client — native only. */
export const db = new Proxy({} as ExpoSQLiteDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    const { drizzleDb: d } = openNative();
    return Reflect.get(d, prop, receiver);
  },
});

/** Run once on boot — create tables if missing. No-op on web. */
export function migrateLocalDb() {
  if (!isLocalDbAvailable) return;
  const { expoDb: expo } = openNative();
  expo.execSync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS sync_state (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS outbox (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      aggregate_key TEXT NOT NULL,
      base_version INTEGER,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS location_points (
      id TEXT PRIMARY KEY NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      accuracy_m REAL NOT NULL,
      recorded_at TEXT NOT NULL,
      sent INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS shift_instances (
      id TEXT PRIMARY KEY NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      deleted INTEGER NOT NULL DEFAULT 0,
      json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS clock_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      deleted INTEGER NOT NULL DEFAULT 0,
      json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS leave_requests (
      id TEXT PRIMARY KEY NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      deleted INTEGER NOT NULL DEFAULT 0,
      json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      deleted INTEGER NOT NULL DEFAULT 0,
      json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      deleted INTEGER NOT NULL DEFAULT 0,
      json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}
