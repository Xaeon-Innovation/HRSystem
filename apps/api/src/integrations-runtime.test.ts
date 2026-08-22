import { describe, expect, it } from "vitest";
import { assertSafeUrl, isPrivateIp } from "../src/integrations/ssrf.js";
import { applyTransform, getPath, mapRecord } from "../src/integrations/mapper.js";
import { parseCsv } from "../src/integrations/connectors/csv.js";

describe("ssrf guards", () => {
  it("flags private IPv4 ranges", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("10.0.0.4")).toBe(true);
    expect(isPrivateIp("192.168.1.1")).toBe(true);
    expect(isPrivateIp("8.8.8.8")).toBe(false);
  });

  it("rejects non-https URLs in production-like mode", async () => {
    await expect(
      assertSafeUrl("http://example.com/api", { allowHttpLoopback: false }),
    ).rejects.toThrow(/HTTPS/);
  });
});

describe("field mapper", () => {
  it("reads nested paths and transforms values", () => {
    const payload = { user: { email: "a@b.com" }, amount: "12.5", status: "done" };
    expect(getPath(payload, "user.email")).toBe("a@b.com");
    expect(applyTransform("12.5", "number_parse", {})).toBe(12.5);
    expect(applyTransform("done", "enum_map", { enumMap: { done: "completed" } })).toBe(
      "completed",
    );
    const mapped = mapRecord(payload, [
      { sourceField: "user.email", targetField: "employee_email", transformType: "direct" },
      { sourceField: "amount", targetField: "amount", transformType: "number_parse" },
    ]);
    expect(mapped.mapped.employee_email).toBe("a@b.com");
    expect(mapped.mapped.amount).toBe(12.5);
  });
});

describe("csv parser", () => {
  it("parses quoted commas", () => {
    const { headers, rows } = parseCsv('id,name\n1,"Smith, Jane"\n');
    expect(headers).toEqual(["id", "name"]);
    expect(rows[0]).toEqual({ id: "1", name: "Smith, Jane" });
  });
});
