import {
  cacheGeneration,
  clearApiCache,
  getApiInflight,
  peekApiCache,
  setApiInflight,
  writeApiCache,
} from "@/lib/api-cache";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type ApiOptions = RequestInit & {
  /** Skip the short-lived GET memory cache (live map, search, history). */
  skipCache?: boolean;
  /** Background fetch, does not hold the navigation progress bar. */
  silent?: boolean;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: "super_admin" | "tenant_admin" | "employee";
  tenantId: string | null;
  employeeId?: string | null;
  systemModuleRoles?: Array<
    "kpis" | "leaves" | "hiring" | "compensation" | "tasks"
  >;
  avatarUrl?: string | null;
  plan?: {
    code: string;
    name: string;
    seatLimit: number | null;
  } | null;
  planFeatures?: Record<string, boolean | number | string>;
  pingIntervalSec?: number;
  accessAllowed?: boolean;
  subscriptionStatus?: string | null;
  trialEndsAt?: string | null;
  workspace?: {
    mode: "unlock_all" | "as_entitled" | "preview_plan";
    previewPlanId?: string | null;
    previewPlanCode?: string | null;
    previewPlanName?: string | null;
    platformLab?: boolean;
    tenantSlug?: string | null;
    tenantName?: string | null;
  };
};

const TOKEN_KEY = "hr_access_token";
const REFRESH_KEY = "hr_refresh_token";
const USER_KEY = "hr_user";
const SESSION_COOKIE = "hr_session";

function writeSessionCookie(on: boolean) {
  if (typeof document === "undefined") return;
  if (on) {
    document.cookie = `${SESSION_COOKIE}=1;path=/;max-age=604800;SameSite=Lax`;
  } else {
    document.cookie = `${SESSION_COOKIE}=;path=/;max-age=0;SameSite=Lax`;
  }
}

/** Per-tab session so admin + employee can be tested side-by-side in two tabs. */
function store() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

export function getTokens() {
  const s = store();
  if (!s) return { access: null, refresh: null };
  return {
    access: s.getItem(TOKEN_KEY),
    refresh: s.getItem(REFRESH_KEY),
  };
}

export function setSession(
  accessToken: string,
  refreshToken: string,
  user: AuthUser,
) {
  const s = store();
  if (!s) return;
  s.setItem(TOKEN_KEY, accessToken);
  s.setItem(REFRESH_KEY, refreshToken);
  s.setItem(USER_KEY, JSON.stringify(user));
  writeSessionCookie(true);
}

export function clearSession() {
  const s = store();
  if (!s) return;
  s.removeItem(TOKEN_KEY);
  s.removeItem(REFRESH_KEY);
  s.removeItem(USER_KEY);
  writeSessionCookie(false);
  clearApiCache();
}

export function getUser(): AuthUser | null {
  const s = store();
  if (!s) return null;
  const raw = s.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function updateSessionUser(user: AuthUser) {
  const s = store();
  if (!s) return;
  const { access, refresh } = getTokens();
  if (access && refresh) {
    setSession(access, refresh, user);
  } else {
    s.setItem(USER_KEY, JSON.stringify(user));
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("hr-session-user"));
  }
}

export function mediaUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
  return `${API_URL}${path}`;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read that image"));
    reader.readAsDataURL(file);
  });
}

async function request(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new Error(
      "Could not reach the server. Check your connection and try again.",
    );
  }
}

/** In-flight `api()` count, used by NavigationProgress to wait for page data. */
let apiInflight = 0;

function bumpApiInflight(delta: number) {
  apiInflight = Math.max(0, apiInflight + delta);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("hr-api-inflight", { detail: { count: apiInflight } }),
    );
  }
}

export async function api<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const { skipCache, silent, ...fetchOptions } = options;
  const method = (fetchOptions.method ?? "GET").toUpperCase();

  if (method === "GET" && !skipCache) {
    const cached = peekApiCache<T>(path);
    if (cached !== undefined) return cached;
    const pending = getApiInflight<T>(path);
    if (pending) return pending;
  } else if (method === "GET") {
    const pending = getApiInflight<T>(path);
    if (pending) return pending;
  }

  const run = (async () => {
    if (!silent) bumpApiInflight(1);
    const gen = cacheGeneration();
    try {
      const { access, refresh } = getTokens();
      const headers = new Headers(fetchOptions.headers);
      if (fetchOptions.body !== undefined && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
      if (access) headers.set("Authorization", `Bearer ${access}`);

      let res = await request(`${API_URL}${path}`, {
        ...fetchOptions,
        headers,
        cache: "no-store",
      });

      if (res.status === 401 && refresh) {
        const refreshed = await request(`${API_URL}/v1/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: refresh }),
        });
        if (refreshed.ok) {
          const data = (await refreshed.json()) as {
            accessToken: string;
            refreshToken: string;
          };
          const user = getUser();
          if (user) setSession(data.accessToken, data.refreshToken, user);
          headers.set("Authorization", `Bearer ${data.accessToken}`);
          res = await request(`${API_URL}${path}`, {
            ...fetchOptions,
            headers,
            cache: "no-store",
          });
        }
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(
          typeof err.error === "string" ? err.error : JSON.stringify(err.error),
        );
      }
      const data = (await res.json()) as T;
      if (method === "GET" && !skipCache) writeApiCache(path, data, Date.now(), gen);
      else if (method !== "GET") clearApiCache();
      return data;
    } finally {
      if (!silent) bumpApiInflight(-1);
    }
  })();

  if (method === "GET") return setApiInflight(path, run);
  return run;
}

export { peekApiCache, clearApiCache };

export function wsUrl() {
  return process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4000/ws";
}

/** Send JWT after connect so it never appears in URLs or proxy access logs. */
export function wsSendAuth(ws: WebSocket, token: string) {
  ws.send(JSON.stringify({ type: "auth", token }));
}

export { API_URL };
