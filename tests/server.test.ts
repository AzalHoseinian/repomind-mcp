import { describe, expect, it } from "vitest";
import { createServer } from "../src/createServer.js";
import { noIssues } from "./fakes.js";

describe("server", () => {
  it("registers the ping tool", () => {
    const server = createServer(process.cwd(), noIssues) as unknown as { _registeredTools: Record<string, unknown> };
    expect(Object.keys(server._registeredTools)).toContain("ping");
    expect(Object.keys(server._registeredTools)).toContain("analyze_repo");
    expect(Object.keys(server._registeredTools)).toContain("list_issues");
  });
});
