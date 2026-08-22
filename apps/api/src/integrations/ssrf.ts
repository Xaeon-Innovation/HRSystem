import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const BLOCKED_HOSTS = new Set(["localhost", "metadata.google.internal"]);

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function isPrivateIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  return (
    (n >= ipv4ToInt("10.0.0.0") && n <= ipv4ToInt("10.255.255.255")) ||
    (n >= ipv4ToInt("172.16.0.0") && n <= ipv4ToInt("172.31.255.255")) ||
    (n >= ipv4ToInt("192.168.0.0") && n <= ipv4ToInt("192.168.255.255")) ||
    (n >= ipv4ToInt("127.0.0.0") && n <= ipv4ToInt("127.255.255.255")) ||
    (n >= ipv4ToInt("169.254.0.0") && n <= ipv4ToInt("169.254.255.255")) ||
    (n >= ipv4ToInt("0.0.0.0") && n <= ipv4ToInt("0.255.255.255")) ||
    (n >= ipv4ToInt("100.64.0.0") && n <= ipv4ToInt("100.127.255.255"))
  );
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.") ||
    normalized.startsWith("::ffff:169.254.")
  );
}

export function isPrivateIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return true;
}

export type AssertSafeUrlOptions = {
  allowHttpLoopback?: boolean;
};

export async function assertSafeUrl(
  raw: string,
  options: AssertSafeUrlOptions = {},
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid URL");
  }

  const allowHttpLoopback =
    options.allowHttpLoopback ?? process.env.NODE_ENV !== "production";

  if (url.protocol !== "https:" && !(allowHttpLoopback && url.protocol === "http:")) {
    throw new Error("Only HTTPS URLs are allowed");
  }

  if (url.username || url.password) {
    throw new Error("URLs with embedded credentials are not allowed");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTS.has(hostname.toLowerCase())) {
    if (!(allowHttpLoopback && hostname.toLowerCase() === "localhost")) {
      throw new Error("Host is not allowed");
    }
  }

  const addresses: string[] = [];
  if (isIP(hostname)) {
    addresses.push(hostname);
  } else {
    const resolved = await lookup(hostname, { all: true });
    addresses.push(...resolved.map((r) => r.address));
  }

  if (addresses.length === 0) {
    throw new Error("Host could not be resolved");
  }

  const loopbackOk =
    allowHttpLoopback &&
    addresses.every((ip) => ip === "127.0.0.1" || ip === "::1");
  if (!loopbackOk && addresses.some(isPrivateIp)) {
    throw new Error("Private or loopback addresses are not allowed");
  }

  return url;
}

export const FETCH_TIMEOUT_MS = 10_000;
export const FETCH_MAX_BYTES = 2_000_000;

export async function safeFetch(
  rawUrl: string,
  init: RequestInit = {},
): Promise<Response> {
  const url = await assertSafeUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      redirect: "error",
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export async function readLimitedJson(
  res: Response,
  maxBytes = FETCH_MAX_BYTES,
): Promise<unknown> {
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength > maxBytes) {
    throw new Error("Response body too large");
  }
  const text = buf.toString("utf8");
  if (!text) return null;
  return JSON.parse(text) as unknown;
}
