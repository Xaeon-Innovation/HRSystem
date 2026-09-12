const GET_CACHE_TTL_MS = 20_000;

type CacheEntry = { data: unknown; expiresAt: number };

const memory = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();
let generation = 0;

export function apiCacheKey(path: string): string {
  return `GET:${path}`;
}

export function cacheGeneration(): number {
  return generation;
}

export function peekApiCache<T>(path: string, now = Date.now()): T | undefined {
  const hit = memory.get(apiCacheKey(path));
  if (!hit || hit.expiresAt <= now) return undefined;
  return hit.data as T;
}

export function writeApiCache(
  path: string,
  data: unknown,
  now = Date.now(),
  expectedGeneration?: number,
): void {
  if (expectedGeneration !== undefined && expectedGeneration !== generation) {
    return;
  }
  memory.set(apiCacheKey(path), { data, expiresAt: now + GET_CACHE_TTL_MS });
}

export function getApiInflight<T>(path: string): Promise<T> | undefined {
  return inflight.get(apiCacheKey(path)) as Promise<T> | undefined;
}

export function setApiInflight<T>(path: string, promise: Promise<T>): Promise<T> {
  const key = apiCacheKey(path);
  inflight.set(key, promise);
  void promise.finally(() => {
    if (inflight.get(key) === promise) inflight.delete(key);
  });
  return promise;
}

export function clearApiCache(): void {
  generation += 1;
  memory.clear();
  inflight.clear();
}

export { GET_CACHE_TTL_MS };
