import { describe, expect, it } from "vitest";
import { hostedLogoUrl } from "./branding";

describe("hostedLogoUrl", () => {
  it("keeps tenant logos served by this API", () => {
    expect(
      hostedLogoUrl(
        "/v1/uploads/logos/11111111-1111-1111-1111-111111111111?v=1",
      ),
    ).toBe("/v1/uploads/logos/11111111-1111-1111-1111-111111111111?v=1");
  });

  it("drops external URLs that often fail to load", () => {
    expect(hostedLogoUrl("https://example.com/logo.png")).toBeNull();
    expect(hostedLogoUrl("http://intranet/share/logo")).toBeNull();
  });

  it("drops empty values", () => {
    expect(hostedLogoUrl(null)).toBeNull();
    expect(hostedLogoUrl("")).toBeNull();
  });
});
