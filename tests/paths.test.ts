import { mkdirSync, mkdtempSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PathOutsideWorkspaceError, resolveInWorkspace } from "../src/workspace/paths.js";

const base = realpathSync(mkdtempSync(path.join(tmpdir(), "rm-paths-")));
const ws = path.join(base, "work");
const evil = path.join(base, "work-evil");
mkdirSync(path.join(ws, "src"), { recursive: true });
mkdirSync(evil);
writeFileSync(path.join(ws, "src", "a.ts"), "x");
writeFileSync(path.join(evil, "secret.txt"), "s");
symlinkSync(evil, path.join(ws, "escape"));
symlinkSync(path.join(ws, "src"), path.join(ws, "inside-link"));

describe("resolveInWorkspace", () => {
  it("resolves nested paths", () => {
    expect(resolveInWorkspace(ws, "src/a.ts")).toBe(path.join(ws, "src", "a.ts"));
  });
  it("allows the workspace root", () => {
    expect(resolveInWorkspace(ws, ".")).toBe(ws);
  });
  it("allows a not-yet-existing file inside the workspace", () => {
    expect(resolveInWorkspace(ws, "src/new.ts")).toBe(path.join(ws, "src", "new.ts"));
  });
  it("allows a symlink that stays inside", () => {
    expect(resolveInWorkspace(ws, "inside-link/a.ts")).toBe(path.join(ws, "src", "a.ts"));
  });
  it("rejects ../ traversal", () => {
    expect(() => resolveInWorkspace(ws, "../work-evil/secret.txt")).toThrow(PathOutsideWorkspaceError);
  });
  it("rejects an absolute path outside", () => {
    expect(() => resolveInWorkspace(ws, "/etc/passwd")).toThrow(PathOutsideWorkspaceError);
  });
  it("rejects a sibling with the same prefix", () => {
    expect(() => resolveInWorkspace(ws, evil)).toThrow(PathOutsideWorkspaceError);
  });
  it("rejects a symlink escaping the workspace", () => {
    expect(() => resolveInWorkspace(ws, "escape/secret.txt")).toThrow(PathOutsideWorkspaceError);
  });
  it("rejects a not-yet-existing file under an escaping symlink", () => {
    expect(() => resolveInWorkspace(ws, "escape/new.txt")).toThrow(PathOutsideWorkspaceError);
  });
});
