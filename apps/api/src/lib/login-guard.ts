/** In-memory login lockout. Keyed by email (+ optional tenant slug). */

export type LoginGuardOptions = {
  maxFailures?: number;
  lockoutMs?: number;
  now?: () => number;
};

type Entry = { failures: number; lockedUntil: number };

const DEFAULT_MAX_FAILURES = 5;
const DEFAULT_LOCKOUT_MS = 15 * 60 * 1000;

export function createLoginGuard(options: LoginGuardOptions = {}) {
  const maxFailures = options.maxFailures ?? DEFAULT_MAX_FAILURES;
  const lockoutMs = options.lockoutMs ?? DEFAULT_LOCKOUT_MS;
  const now = options.now ?? Date.now;
  const store = new Map<string, Entry>();

  function lockKey(email: string, tenantSlug?: string | null) {
    return `${(tenantSlug ?? "").toLowerCase()}|${email.trim().toLowerCase()}`;
  }

  function get(key: string): Entry {
    const entry = store.get(key);
    if (!entry) return { failures: 0, lockedUntil: 0 };
    if (entry.lockedUntil && entry.lockedUntil <= now()) {
      store.delete(key);
      return { failures: 0, lockedUntil: 0 };
    }
    return entry;
  }

  return {
    isLocked(email: string, tenantSlug?: string | null): boolean {
      const entry = get(lockKey(email, tenantSlug));
      return entry.lockedUntil > now();
    },

    remainingLockMs(email: string, tenantSlug?: string | null): number {
      const entry = get(lockKey(email, tenantSlug));
      return Math.max(0, entry.lockedUntil - now());
    },

    recordFailure(email: string, tenantSlug?: string | null): {
      locked: boolean;
      failures: number;
    } {
      const key = lockKey(email, tenantSlug);
      const entry = get(key);
      const failures = entry.failures + 1;
      const lockedUntil =
        failures >= maxFailures ? now() + lockoutMs : entry.lockedUntil;
      store.set(key, { failures, lockedUntil });
      return { locked: lockedUntil > now(), failures };
    },

    clear(email: string, tenantSlug?: string | null) {
      store.delete(lockKey(email, tenantSlug));
    },

    /** Test helper */
    _reset() {
      store.clear();
    },
  };
}

export type LoginGuard = ReturnType<typeof createLoginGuard>;

export const loginGuard = createLoginGuard();
