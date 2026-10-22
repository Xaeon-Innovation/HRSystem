import type {
  MobileLoginRequest,
  MobileMe,
  MobileWorkspaceResponse,
} from "@hr/shared";
import { getApiUrl } from "./config";
import { getMobileDevice } from "./device";
import { useSession } from "./session";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

type TokenPair = { accessToken: string; refreshToken: string };

let refreshInFlight: Promise<TokenPair | null> | null = null;

async function parseError(res: Response): Promise<ApiError> {
  let body: unknown = null;
  let message = res.statusText || "Request failed";
  try {
    body = await res.json();
    if (body && typeof body === "object" && "error" in body) {
      const err = (body as { error: unknown }).error;
      message = typeof err === "string" ? err : message;
    }
  } catch {
    /* ignore */
  }
  return new ApiError(res.status, message, body);
}

async function rawFetch(
  path: string,
  init: RequestInit & { accessToken?: string | null } = {},
): Promise<Response> {
  const { accessToken, headers, ...rest } = init;
  const h = new Headers(headers);
  if (!h.has("Content-Type") && rest.body) {
    h.set("Content-Type", "application/json");
  }
  if (accessToken) h.set("Authorization", `Bearer ${accessToken}`);
  return fetch(`${getApiUrl()}${path}`, { ...rest, headers: h });
}

/** Single-flight refresh — parallel 401s share one rotate. */
async function refreshTokens(): Promise<TokenPair | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const { refreshToken, setTokens, clearSession } = useSession.getState();
    if (!refreshToken) {
      clearSession();
      return null;
    }
    const device = await getMobileDevice();
    const res = await rawFetch("/v1/mobile/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken, deviceId: device.id }),
    });
    if (!res.ok) {
      clearSession();
      return null;
    }
    const data = (await res.json()) as TokenPair;
    await setTokens(data.accessToken, data.refreshToken);
    return data;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

/** Authenticated fetch with one retry after refresh. */
export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const { accessToken } = useSession.getState();
  let res = await rawFetch(path, { ...init, accessToken });
  if (res.status !== 401) return res;

  const next = await refreshTokens();
  if (!next) return res;
  return rawFetch(path, { ...init, accessToken: next.accessToken });
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<T>;
}

export async function lookupWorkspace(slug: string): Promise<MobileWorkspaceResponse> {
  const res = await rawFetch("/v1/mobile/auth/workspace", {
    method: "POST",
    body: JSON.stringify({ slug }),
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<MobileWorkspaceResponse>;
}

export async function loginWithPassword(input: {
  slug: string;
  email: string;
  password: string;
}): Promise<{
  accessToken: string;
  refreshToken: string;
  mustChangePassword: boolean;
  me: MobileMe;
}> {
  const device = await getMobileDevice();
  const body: MobileLoginRequest = {
    slug: input.slug,
    email: input.email,
    password: input.password,
    device,
  };
  const res = await rawFetch("/v1/mobile/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await apiJson("/v1/mobile/auth/change-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function fetchMe(): Promise<MobileMe> {
  return apiJson<MobileMe>("/v1/mobile/me");
}

export async function logoutRemote(): Promise<void> {
  const device = await getMobileDevice();
  const { refreshToken } = useSession.getState();
  try {
    await apiFetch("/v1/mobile/auth/logout", {
      method: "POST",
      body: JSON.stringify({ deviceId: device.id, refreshToken: refreshToken ?? undefined }),
    });
  } catch {
    /* best-effort */
  }
}
