export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const USER_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUserId(value: string): boolean {
  return USER_ID_RE.test(value);
}

export function decodeBase64Image(input: string): Buffer {
  const trimmed = input.trim();
  const comma = trimmed.indexOf(",");
  const payload = comma >= 0 ? trimmed.slice(comma + 1) : trimmed;
  const buf = Buffer.from(payload.replace(/\s/g, ""), "base64");
  if (!buf.length) {
    throw new Error("Invalid image data");
  }
  if (buf.length > MAX_AVATAR_BYTES) {
    throw new Error("Image must be 2 MB or smaller");
  }
  return buf;
}

export function detectImageMime(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    buf.length >= 6 &&
    buf[0] === 0x47 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x38 &&
    (buf[4] === 0x37 || buf[4] === 0x39) &&
    buf[5] === 0x61
  ) {
    return "image/gif";
  }
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export function avatarPublicPath(userId: string, versionMs: number): string {
  return `/v1/uploads/avatars/${userId}?v=${versionMs}`;
}

export function avatarUrlFor(
  userId: string,
  avatarMime: string | null | undefined,
  updatedAt?: Date | string | null,
): string | null {
  if (!avatarMime) return null;
  const ms =
    updatedAt instanceof Date
      ? updatedAt.getTime()
      : updatedAt
        ? new Date(updatedAt).getTime()
        : Date.now();
  return avatarPublicPath(userId, Number.isFinite(ms) ? ms : Date.now());
}
