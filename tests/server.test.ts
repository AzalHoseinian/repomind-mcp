import { describe, expect, it } from "vitest";
import { createServer } from "../src/createServer.js";

describe("server", () => {
  it("registers the ping tool", () => {
    const server = createServer() as unknown as { _registeredTools: Record<string, unknown> };
    expect(Object.keys(server._registeredTools)).toContain("ping");
  });
});
