import { mkdirSync, mkdtempSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createServer } from "../src/createServer.js";
import { LIMITS, analyzeRepo, parseDependencies } from "../src/services/analyzeRepo.js";

function tmp(): string {
  return realpathSync(mkdtempSync(path.join(tmpdir(), "rm-an-")));
}
function write(root: string, rel: string, content: string): void {
  const f = path.join(root, rel);
  mkdirSync(path.dirname(f), { recursive: true });
  writeFileSync(f, content);
}

describe("analyzeRepo", () => {
  it("counts languages and reads dependency names from a mixed repo", () => {
    const root = tmp();
    write(root, "package.json", JSON.stringify({ dependencies: { zod: "^4" }, devDependencies: { vitest: "3" } }));
    write(root, "src/a.ts", "a\nb\nc\n");
    write(root, "app/main.py", "print(1)\n");
    write(root, "requirements.txt", "requests>=2 # http\n-r other.txt\nflask[async]==3\n");
    write(root, "node_modules/x/index.js", "ignored\n");
    const r = analyzeRepo(root);
    expect(r.languages[".ts"]).toEqual({ files: 1, lines: 3 });
    expect(r.languages[".py"]).toEqual({ files: 1, lines: 1 });
    expect(r.languages[".js"]).toBeUndefined();
    const byFile = Object.fromEntries(r.manifests.map((m) => [m.file, m.dependencies]));
    expect(byFile["package.json"]).toEqual(["vitest", "zod"]);
    expect(byFile["requirements.txt"]).toEqual(["flask", "requests"]);
    expect(r.topLevel).toContain("src");
    expect(r.truncated).toBe(false);
  });

  it("returns partial results with truncated=true above the file limit", () => {
    const root = tmp();
    for (let i = 0; i < LIMITS.maxFiles + 5; i++) write(root, `d/f${i}.txt`, "x\n");
    const r = analyzeRepo(root);
    expect(r.truncated).toBe(true);
    expect(r.languages[".txt"]!.files).toBe(LIMITS.maxFiles);
  }, 30000);

  it("does not hang or recurse on symlink loops", () => {
    const root = tmp();
    write(root, "a/f.ts", "x\n");
    symlinkSync(root, path.join(root, "a", "loop"));
    const r = analyzeRepo(root);
    expect(r.languages[".ts"]!.files).toBe(1);
  });

  it("skips binary files and invalid UTF-8", () => {
    const root = tmp();
    writeFileSync(path.join(root, "b.bin"), Buffer.from([0, 1, 2]));
    writeFileSync(path.join(root, "bad.txt"), Buffer.from([0xff, 0xfe, 0x41]));
    expect(analyzeRepo(root).languages).toEqual({});
  });

  it("survives a malformed manifest", () => {
    expect(parseDependencies("package.json", "{ not json")).toEqual([]);
  });
});

describe("analyze_repo tool", () => {
  async function call(workspace: string, args: unknown) {
    const server = createServer(workspace) as unknown as {
      _registeredTools: Record<string, { handler?: Function; callback?: Function }>;
    };
    const tool = server._registeredTools["analyze_repo"]!;
    const fn = (tool.handler ?? tool.callback)!;
    return fn(args, {}) as Promise<{ isError?: boolean; content: { text: string }[] }>;
  }

  it("returns a structured error for a path outside the workspace", async () => {
    const res = await call(tmp(), { path: "../" });
    expect(res.isError).toBe(true);
    expect(res.content[0]!.text).toMatch(/outside the workspace/);
  });

  it("analyzes a path inside the workspace", async () => {
    const root = tmp();
    write(root, "x.ts", "a\n");
    const res = await call(root, { path: "." });
    expect(res.isError).toBeUndefined();
    expect(JSON.parse(res.content[0]!.text).languages[".ts"].files).toBe(1);
  });
});
