const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: "super_admin" | "tenant_admin" | "employee";
  tenantId: string | null;
  employeeId?: string | null;
};

const TOKEN_KEY = "hr_access_token";
const REFRESH_KEY = "hr_refresh_token";
const USER_KEY = "hr_user";

export function getTokens() {
  if (typeof window === "undefined") return { access: null, refresh: null };
  return {
    access: localStorage.getItem(TOKEN_KEY),
    refresh: localStorage.getItem(REFRESH_KEY),
  };
}

export function setSession(
  accessToken: string,
  refreshToken: string,
  user: AuthUser,
) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const { access, refresh } = getTokens();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (access) headers.set("Authorization", `Bearer ${access}`);

  let res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401 && refresh) {
    const refreshed = await fetch(`${API_URL}/v1/auth/refresh`, {
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
      res = await fetch(`${API_URL}${path}`, { ...options, headers });
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
