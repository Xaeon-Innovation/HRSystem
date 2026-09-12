import { afterEach, describe, expect, it } from "vitest";
import {
  GET_CACHE_TTL_MS,
  cacheGeneration,
  clearApiCache,
  getApiInflight,
  peekApiCache,
  setApiInflight,
  writeApiCache,
} from "./api-cache";

afterEach(() => {
  clearApiCache();
});

describe("api cache", () => {
  it("returns stored GET payloads until they expire", () => {
    writeApiCache("/v1/employees", { employees: [1] }, 1_000);
    expect(peekApiCache("/v1/employees", 1_000)).toEqual({ employees: [1] });
    expect(peekApiCache("/v1/employees", 1_000 + GET_CACHE_TTL_MS)).toBeUndefined();
  });

  it("does not leak one path into another", () => {
    writeApiCache("/v1/a", { a: true }, 1);
    expect(peekApiCache("/v1/b", 1)).toBeUndefined();
  });

  it("does not write after the cache has been cleared", () => {
    const gen = cacheGeneration();
    clearApiCache();
    writeApiCache("/v1/stale", { stale: true }, 1, gen);
    expect(peekApiCache("/v1/stale", 1)).toBeUndefined();
  });

  it("shares an in-flight GET and drops it when settled", async () => {
    let resolve!: (value: string) => void;
    const promise = new Promise<string>((r) => {
      resolve = r;
    });
    const shared = setApiInflight("/v1/me", promise);
    expect(getApiInflight("/v1/me")).toBe(shared);
    resolve("ok");
    await expect(shared).resolves.toBe("ok");
    expect(getApiInflight("/v1/me")).toBeUndefined();
  });
});
