import { describe, expect, it } from "vitest";
import {
  avatarUrlFor,
  decodeBase64Image,
  detectImageMime,
  isUserId,
} from "./avatar.js";

const PNG_1X1 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("avatar helpers", () => {
  it("detects png magic bytes", () => {
    const buf = decodeBase64Image(PNG_1X1);
    expect(detectImageMime(buf)).toBe("image/png");
  });

  it("accepts a data URL", () => {
    const buf = decodeBase64Image(`data:image/png;base64,${PNG_1X1}`);
    expect(detectImageMime(buf)).toBe("image/png");
  });

  it("rejects non-images", () => {
    const buf = Buffer.from("not-an-image");
    expect(detectImageMime(buf)).toBeNull();
  });

  it("builds a public avatar path only when a mime is set", () => {
    const id = "11111111-1111-1111-1111-111111111111";
    expect(avatarUrlFor(id, null)).toBeNull();
    expect(avatarUrlFor(id, "image/png", new Date(1_700_000_000_000))).toBe(
      `/v1/uploads/avatars/${id}?v=1700000000000`,
    );
  });

  it("validates user ids used as avatar filenames", () => {
    expect(isUserId("11111111-1111-1111-1111-111111111111")).toBe(true);
    expect(isUserId("../etc/passwd")).toBe(false);
  });
});
