import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "../src/config/config.js";

describe("loadConfig", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "rm-cfg-"));

  it("accepts an existing absolute directory", () => {
    expect(loadConfig({ REPOMIND_WORKSPACE: dir })).toMatchObject({ workspace: dir });
  });
  it("rejects a missing value", () => {
    expect(() => loadConfig({})).toThrow(ConfigError);
  });
  it("rejects a relative path", () => {
    expect(() => loadConfig({ REPOMIND_WORKSPACE: "relative/dir" })).toThrow(/absolute/);
  });
  it("rejects a non-existent directory", () => {
    expect(() => loadConfig({ REPOMIND_WORKSPACE: path.join(dir, "nope") })).toThrow(/existing directory/);
  });
  it("rejects a file", () => {
    const f = path.join(dir, "f.txt");
    writeFileSync(f, "x");
    expect(() => loadConfig({ REPOMIND_WORKSPACE: f })).toThrow(/existing directory/);
  });
});
