import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { fileURLToPath } from "node:url";
import path from "node:path";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://hr:hr@localhost:5432/hr_system";

async function main() {
  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);
  const migrationsFolder = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "drizzle",
  );
  console.log(`Migrating with ${connectionString.replace(/:[^:@]+@/, ":***@")}`);
  await migrate(db, { migrationsFolder });
  await client.end();
  console.log("Migrations complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
