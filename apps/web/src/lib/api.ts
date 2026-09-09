const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: "super_admin" | "tenant_admin" | "employee";
  tenantId: string | null;
  employeeId?: string | null;
  systemModuleRoles?: Array<"kpis" | "leaves" | "hiring" | "compensation">;
  avatarUrl?: string | null;
};

const TOKEN_KEY = "hr_access_token";
const REFRESH_KEY = "hr_refresh_token";
const USER_KEY = "hr_user";

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
}

export function clearSession() {
  const s = store();
  if (!s) return;
  s.removeItem(TOKEN_KEY);
  s.removeItem(REFRESH_KEY);
  s.removeItem(USER_KEY);
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
      "Could not reach the server. Try a smaller photo, or check your connection.",
    );
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const { access, refresh } = getTokens();
  const headers = new Headers(options.headers);
  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (access) headers.set("Authorization", `Bearer ${access}`);

  let res = await request(`${API_URL}${path}`, { ...options, headers });

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
      res = await request(`${API_URL}${path}`, { ...options, headers });
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(
      typeof err.error === "string" ? err.error : JSON.stringify(err.error),
    );
  }
  return res.json() as Promise<T>;
}

export function wsUrl(token: string) {
  const base = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4000/ws";
  return `${base}?token=${encodeURIComponent(token)}`;
}

export { API_URL };
