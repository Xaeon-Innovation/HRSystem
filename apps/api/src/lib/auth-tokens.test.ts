import { describe, expect, it } from "vitest";
import { createSigner, createVerifier } from "fast-jwt";
import type { JwtPayload } from "@hr/shared";
import { signTokens, verifyRefreshToken } from "./auth-tokens.js";
import type { App } from "../types.js";

const ACCESS_SECRET = "access-secret-for-tests-min-32-chars!!";
const REFRESH_SECRET = "refresh-secret-for-tests-min-32-chars!";

function fakeApp(): App {
  const signAccess = createSigner({ key: ACCESS_SECRET, expiresIn: "15m" });
  return {
    jwt: {
      sign: (payload: object, opts?: { expiresIn?: string }) => {
        if (opts?.expiresIn === "7d") {
          throw new Error("refresh must not use access jwt.sign");
        }
        return signAccess(payload);
      },
      verify: createVerifier({ key: ACCESS_SECRET }),
    },
    env: { jwtRefreshSecret: REFRESH_SECRET },
  } as unknown as App;
}

const payload: JwtPayload = {
  sub: "user-1",
  role: "employee",
  tenantId: "tenant-1",
  employeeId: "emp-1",
  systemModuleRoles: [],
};

describe("signTokens / verifyRefreshToken", () => {
  it("signs refresh with jwtRefreshSecret, not the access secret", () => {
    const app = fakeApp();
    const tokens = signTokens(app, payload);

    const accessVerifier = createVerifier({ key: ACCESS_SECRET });
    const refreshVerifier = createVerifier({ key: REFRESH_SECRET });

    expect(accessVerifier(tokens.accessToken)).toMatchObject({
      sub: "user-1",
      role: "employee",
    });
    expect(() => accessVerifier(tokens.refreshToken)).toThrow();
    expect(refreshVerifier(tokens.refreshToken)).toMatchObject({
      sub: "user-1",
      typ: "refresh",
    });

    const verified = verifyRefreshToken(app, tokens.refreshToken);
    expect(verified.sub).toBe("user-1");
    expect(verified.typ).toBe("refresh");
  });

  it("rejects an access token used as refresh", () => {
    const app = fakeApp();
    const { accessToken } = signTokens(app, payload);
    expect(() => verifyRefreshToken(app, accessToken)).toThrow();
  });
});
