import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function getKey(): Buffer {
  const secret =
    process.env.INTEGRATION_SECRETS_KEY ??
    process.env.JWT_SECRET ??
    "dev-integration-secrets-key-change-me";
  return createHash("sha256").update(secret).digest();
}

/** AES-256-GCM blob (iv + tag + ciphertext), base64. */
export function sealSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(plaintext, "utf8")),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

/** Returns null if the payload is missing or cannot be decrypted. */
export function openSecret(payload: string | null | undefined): string | null {
  if (!payload) return null;
  try {
    const buf = Buffer.from(payload, "base64");
    if (buf.length < 29) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
      "utf8",
    );
  } catch {
    return null;
  }
}
