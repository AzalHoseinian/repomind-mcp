import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

const EnvSchema = z.object({
  REPOMIND_WORKSPACE: z
    .string({ error: "REPOMIND_WORKSPACE is required" })
    .refine((p) => path.isAbsolute(p), "REPOMIND_WORKSPACE must be an absolute path")
    .refine(
      (p) => existsSync(p) && statSync(p).isDirectory(),
      "REPOMIND_WORKSPACE must be an existing directory",
    ),
  GITHUB_TOKEN: z.string().min(1).optional(),
  REPOMIND_ALLOW_WRITES: z.enum(["true", "false"]).optional(),
  REPOMIND_WRITE_REPOS: z.string().optional(),
});

export interface Config {
  workspace: string;
  /** Never log or return this value. */
  githubToken?: string;
  /** Off unless REPOMIND_ALLOW_WRITES=true. */
  allowWrites: boolean;
  /** Lowercased owner/name entries; empty means any repo. */
  writeRepos: string[];
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/** Pure: takes the environment as an argument so tests do not touch process.env. */
export function loadConfig(env: Record<string, string | undefined>): Config {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => i.message).join("; ");
    throw new ConfigError(`Invalid configuration: ${details}`);
  }
  const { REPOMIND_WORKSPACE, GITHUB_TOKEN, REPOMIND_ALLOW_WRITES, REPOMIND_WRITE_REPOS } = parsed.data;
  const writeRepos = (REPOMIND_WRITE_REPOS ?? "")
    .split(",")
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean);
  const base = {
    workspace: REPOMIND_WORKSPACE,
    allowWrites: REPOMIND_ALLOW_WRITES === "true",
    writeRepos,
  };
  return GITHUB_TOKEN ? { ...base, githubToken: GITHUB_TOKEN } : base;
}
