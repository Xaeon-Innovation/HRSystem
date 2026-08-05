/**
 * Lightweight concurrent connection smoke script for Phase 6 load checks.
 * Usage: ACCESS_TOKEN=... TENANT_COUNT=2 CONCURRENCY=20 pnpm --filter @hr/api exec tsx src/scripts/load-smoke.ts
 */
const API = process.env.API_URL ?? "http://localhost:4000";
const token = process.env.ACCESS_TOKEN;
const concurrency = Number(process.env.CONCURRENCY ?? 20);

async function one(i: number) {
  const started = Date.now();
  const res = await fetch(`${API}/health`);
  if (!res.ok) throw new Error(`health failed ${res.status}`);
  if (token) {
    await fetch(`${API}/v1/admin/live-map`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  return Date.now() - started;
}

async function main() {
  const times = await Promise.all(
    Array.from({ length: concurrency }, (_, i) => one(i)),
  );
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const max = Math.max(...times);
  console.log(
    JSON.stringify({ concurrency, avgMs: Math.round(avg), maxMs: max }, null, 2),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
