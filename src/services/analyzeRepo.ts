import { closeSync, openSync, readSync, readdirSync, statSync, lstatSync } from "node:fs";
import path from "node:path";

export const LIMITS = { maxFiles: 5000, maxFileBytes: 1_000_000 } as const;

const IGNORED_DIRS = new Set([
  ".git", "node_modules", "dist", "build", ".venv", "venv", "__pycache__", "target",
]);

const MANIFESTS = [
  "package.json", "pyproject.toml", "requirements.txt", "go.mod", "Cargo.toml", "pom.xml",
] as const;

export interface AnalyzeResult {
  languages: Record<string, { files: number; lines: number }>;
  manifests: { file: string; dependencies: string[] }[];
  topLevel: string[];
  truncated: boolean;
}

/** Read a file as UTF-8 text, or null if too large / unreadable / binary. */
function readText(file: string): string | null {
  try {
    const size = statSync(file).size;
    if (size > LIMITS.maxFileBytes) return null;
    const buf = Buffer.alloc(size);
    const fd = openSync(file, "r");
    try {
      readSync(fd, buf, 0, size, 0);
    } finally {
      closeSync(fd);
    }
    if (buf.includes(0)) return null;
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return null;
  }
}

/** Manifests are parsed as data only. Nothing from them is ever executed. */
export function parseDependencies(name: string, text: string): string[] {
  const deps = new Set<string>();
  try {
    if (name === "package.json") {
      const data = JSON.parse(text) as Record<string, unknown>;
      for (const key of ["dependencies", "devDependencies"]) {
        const section = data[key];
        if (section && typeof section === "object") Object.keys(section).forEach((d) => deps.add(d));
      }
    } else if (name === "requirements.txt") {
      for (const raw of text.split("\n")) {
        const line = raw.split("#", 1)[0]!.trim();
        if (!line || line.startsWith("-")) continue;
        const dep = line.split(/[<>=!~;[\s]/, 1)[0];
        if (dep) deps.add(dep);
      }
    } else if (name === "go.mod") {
      for (const m of text.matchAll(/^\s*(?:require\s+)?([\w.\-/]+\.[\w.\-/]+)\s+v[\w.\-+]+/gm)) deps.add(m[1]!);
    } else if (name === "Cargo.toml") {
      const section = /\[(?:dev-)?dependencies\]([\s\S]*?)(?=\n\[|$)/g;
      for (const s of text.matchAll(section))
        for (const m of s[1]!.matchAll(/^\s*([\w\-]+)\s*=/gm)) deps.add(m[1]!);
    } else if (name === "pom.xml") {
      for (const m of text.matchAll(/<artifactId>([^<]+)<\/artifactId>/g)) deps.add(m[1]!.trim());
    } else if (name === "pyproject.toml") {
      const block = /dependencies\s*=\s*\[([\s\S]*?)\]/.exec(text);
      if (block)
        for (const m of block[1]!.matchAll(/["']([A-Za-z0-9_.\-]+)/g)) deps.add(m[1]!);
    }
  } catch {
    // Malformed manifest: report no dependencies rather than failing the whole analysis.
  }
  return [...deps].sort();
}

/** `root` must already be a confined real path (see resolveInWorkspace). */
export function analyzeRepo(root: string): AnalyzeResult {
  const languages: AnalyzeResult["languages"] = {};
  const manifests: AnalyzeResult["manifests"] = [];
  let seen = 0;
  let truncated = false;

  const topLevel = readdirSync(root).sort();

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (truncated) return;
      const full = path.join(dir, entry.name);
      // Never follow symlinks: they could loop or leave the workspace.
      if (entry.isSymbolicLink() || lstatSync(full).isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      if (++seen > LIMITS.maxFiles) {
        truncated = true;
        return;
      }
      const text = readText(full);
      if (text === null) continue;
      const ext = path.extname(entry.name).toLowerCase() || "(none)";
      const lang = (languages[ext] ??= { files: 0, lines: 0 });
      lang.files += 1;
      lang.lines += text === "" ? 0 : text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
      if ((MANIFESTS as readonly string[]).includes(entry.name)) {
        manifests.push({
          file: path.relative(root, full),
          dependencies: parseDependencies(entry.name, text),
        });
      }
    }
  };
  walk(root);

  const sorted = Object.fromEntries(
    Object.entries(languages).sort((a, b) => b[1].lines - a[1].lines),
  );
  return { languages: sorted, manifests, topLevel, truncated };
}
