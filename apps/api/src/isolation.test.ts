import { describe, expect, it } from "vitest";
import { addClient, broadcastToTenant, roomSize } from "../src/ws-hub.js";

describe("ws hub tenant isolation", () => {
  it("broadcasts only to matching tenant room", () => {
    const receivedA: string[] = [];
    const receivedB: string[] = [];
    const a = { send: (d: string) => receivedA.push(d) };
    const b = { send: (d: string) => receivedB.push(d) };
    addClient("tenant:t1:map", a);
    addClient("tenant:t2:map", b);
    broadcastToTenant("t1", { type: "location.update", payload: { x: 1 } });
    expect(receivedA).toHaveLength(1);
    expect(receivedB).toHaveLength(0);
    expect(roomSize("tenant:t1:map")).toBe(1);
  });
});
