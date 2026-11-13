import { describe, expect, it, vi } from "vitest";
import { loadConfig } from "../src/config/config.js";
import { GitHubError } from "../src/github/issuesClient.js";
import type { IssueWriter } from "../src/github/issueWriter.js";
import { createIssue, type Confirm, type WriteSettings } from "../src/services/createIssue.js";
import type { DraftInput } from "../src/services/draftIssue.js";
import { elicitationConfirm } from "../src/tools/createIssue.js";

const input: DraftInput = {
  title: "  Add pagination  ",
  problem: "p", motivation: "m", expectedBehavior: "e", technicalApproach: "t",
  acceptanceCriteria: ["a", "b"], testingRequirements: "x",
};
const on: WriteSettings = { enabled: true, hasToken: true, allowedRepos: [] };

function setup(answer: Parameters<typeof Promise.resolve>[0] = "accept") {
  const writer: IssueWriter = {
    createIssue: vi.fn(async () => ({ number: 42, url: "https://github.com/o/r/issues/42" })),
  };
  const confirm: Confirm = vi.fn(async () => answer as never);
  return { writer, confirm };
}

describe("createIssue refusals never write", () => {
  it("writes disabled", async () => {
    const { writer, confirm } = setup();
    const r = await createIssue(writer, "o/r", input, { ...on, enabled: false }, confirm);
    expect(r).toMatchObject({ created: false, reason: "writes_disabled" });
    expect(writer.createIssue).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });
  it("no token / no writer", async () => {
    const { confirm } = setup();
    const r = await createIssue(undefined, "o/r", input, { ...on, hasToken: false }, confirm);
    expect(r).toMatchObject({ created: false, reason: "no_token" });
    expect(confirm).not.toHaveBeenCalled();
  });
  it("repo outside the allowlist is refused before any prompt", async () => {
    const { writer, confirm } = setup();
    const r = await createIssue(writer, "evil/repo", input, { ...on, allowedRepos: ["o/r"] }, confirm);
    expect(r).toMatchObject({ created: false, reason: "repo_not_allowed" });
    expect(confirm).not.toHaveBeenCalled();
    expect(writer.createIssue).not.toHaveBeenCalled();
  });
  it.each([
    ["decline", "declined"],
    ["cancel", "cancelled"],
    ["unsupported", "confirmation_unsupported"],
  ])("answer %s creates nothing", async (answer, reason) => {
    const { writer, confirm } = setup(answer);
    const r = await createIssue(writer, "o/r", input, on, confirm);
    expect(r).toMatchObject({ created: false, reason });
    expect(writer.createIssue).not.toHaveBeenCalled();
  });
});

describe("createIssue success", () => {
  it("creates exactly one issue with the confirmed text and returns number and url", async () => {
    const { writer, confirm } = setup("accept");
    const ok = await createIssue(writer, "o/r", { ...input, labels: ["bug"] }, { ...on, allowedRepos: ["o/r"] }, confirm);
    expect(ok).toEqual({ created: true, number: 42, url: "https://github.com/o/r/issues/42" });
    expect(writer.createIssue).toHaveBeenCalledTimes(1);
    const [owner, repo, issue] = (writer.createIssue as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect([owner, repo]).toEqual(["o", "r"]);
    expect(issue.title).toBe("Add pagination");
    expect(issue.body).toContain("## Acceptance criteria");
    expect(issue.labels).toEqual(["bug"]);
    // what the user confirmed is what was sent
    const summary = (confirm as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(summary.title).toBe(issue.title);
    expect(issue.body.startsWith(summary.excerpt)).toBe(true);
  });

  it("maps a GitHub failure to a refusal without throwing", async () => {
    const writer: IssueWriter = {
      createIssue: async () => {
        throw new GitHubError("unauthorized", "bad token");
      },
    };
    const r = await createIssue(writer, "o/r", input, on, async () => "accept");
    expect(r).toMatchObject({ created: false, reason: "github_error" });
  });
});

describe("allowlist matching", () => {
  it("is case-insensitive, like GitHub repo names", async () => {
    const { writer, confirm } = setup("accept");
    const r = await createIssue(writer, "Owner/Repo", input, { ...on, allowedRepos: ["owner/repo"] }, confirm);
    expect(r).toMatchObject({ created: true });
  });
});

describe("elicitationConfirm", () => {
  it("accepts only an explicit accept with confirm=true", async () => {
    const summary = { repo: "o/r", title: "t", excerpt: "x" };
    expect(await elicitationConfirm(async () => ({ action: "accept", content: { confirm: true } }))(summary)).toBe("accept");
    expect(await elicitationConfirm(async () => ({ action: "accept", content: { confirm: false } }))(summary)).toBe("decline");
    expect(await elicitationConfirm(async () => ({ action: "accept" }))(summary)).toBe("decline");
    expect(await elicitationConfirm(async () => ({ action: "decline" }))(summary)).toBe("decline");
    expect(await elicitationConfirm(async () => ({ action: "cancel" }))(summary)).toBe("cancel");
  });
  it("fails closed when elicitation is unsupported or throws", async () => {
    const confirm = elicitationConfirm(async () => {
      throw new Error("Client does not support elicitation");
    });
    expect(await confirm({ repo: "o/r", title: "t", excerpt: "x" })).toBe("unsupported");
  });
  it("shows repo, title and excerpt in the prompt", async () => {
    let seen: unknown;
    await elicitationConfirm(async (p) => {
      seen = p;
      return { action: "cancel" };
    })({ repo: "o/r", title: "My title", excerpt: "BODY" });
    expect(JSON.stringify(seen)).toMatch(/o\/r.*My title.*BODY/s);
  });
});

describe("write config", () => {
  it("is off by default and parses the allowlist", () => {
    const base = { REPOMIND_WORKSPACE: process.cwd() };
    expect(loadConfig(base)).toMatchObject({ allowWrites: false, writeRepos: [] });
    expect(
      loadConfig({ ...base, REPOMIND_ALLOW_WRITES: "true", REPOMIND_WRITE_REPOS: " Owner/Repo , a/b " }),
    ).toMatchObject({ allowWrites: true, writeRepos: ["owner/repo", "a/b"] });
  });
  it("rejects a garbage REPOMIND_ALLOW_WRITES value", () => {
    expect(() => loadConfig({ REPOMIND_WORKSPACE: process.cwd(), REPOMIND_ALLOW_WRITES: "yes" })).toThrow();
  });
});

describe("tool schema", () => {
  it("has no 'confirmed' style bypass field", async () => {
    const { DraftIssueInput } = await import("../src/tools/draftIssue.js");
    expect(Object.keys(DraftIssueInput.shape).some((k) => /confirm|approve|force/i.test(k))).toBe(false);
  });
});
