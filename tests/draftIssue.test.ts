import { describe, expect, it } from "vitest";
import { createServer } from "../src/createServer.js";
import { GitHubError, type IssuesClient } from "../src/github/issuesClient.js";
import { draftIssue, escapeHeadings, renderMarkdown, type DraftInput } from "../src/services/draftIssue.js";
import { DraftIssueInput } from "../src/tools/draftIssue.js";
import { fakeClient } from "./fakes.js";

const input: DraftInput = {
  title: "Add pagination to list_issues",
  problem: "Only 100 issues are fetched.",
  motivation: "Large repos are missed.",
  expectedBehavior: "Follow pages up to a cap.",
  technicalApproach: "Use octokit.paginate.",
  acceptanceCriteria: ["Fetches page 2", "Stops at the cap"],
  testingRequirements: "Fake client with 250 issues.",
};
const valid = { repo: "o/r", ...input };

describe("renderMarkdown", () => {
  it("renders all six sections in order with numbered criteria", () => {
    const md = renderMarkdown(input);
    const headings = md.match(/^## .*/gm);
    expect(headings).toEqual([
      "## Problem", "## Motivation", "## Expected behavior",
      "## Technical approach", "## Acceptance criteria", "## Testing requirements",
    ]);
    expect(md).toContain("1. Fetches page 2\n2. Stops at the cap");
  });

  it("does not let a field open its own section", () => {
    const md = renderMarkdown({ ...input, problem: "ok\n# Fake top\n## Fake section\n  ### deep" });
    expect(md.match(/^#{1,6} /gm)).toHaveLength(6); // only our six headings are real
    expect(escapeHeadings("# x")).toBe("\\# x");
  });

  it("keeps a multi-line criterion on one list item", () => {
    const md = renderMarkdown({ ...input, acceptanceCriteria: ["a\n# b"] });
    expect(md).toContain("1. a \\# b");
  });
});

describe("draftIssue service", () => {
  it("lists likely duplicates", async () => {
    const client = fakeClient([{ title: "Add pagination to list_issues", body: "Only 100 issues are fetched." }]);
    const out = await draftIssue(client, "o/r", input);
    expect(out.status).toBe("draft");
    expect(out.duplicateCheck).toBe("done");
    expect(out.possibleDuplicates[0]!.number).toBe(1);
  });

  it("skips the duplicate check on a GitHub failure instead of failing", async () => {
    const failing: IssuesClient = {
      listIssues: async () => {
        throw new GitHubError("rate_limited", "limit");
      },
    };
    const out = await draftIssue(failing, "o/r", input);
    expect(out.duplicateCheck).toBe("skipped");
    expect(out.possibleDuplicates).toEqual([]);
    expect(out.markdown).toContain("## Problem");
  });

  it("only ever uses the read method of the client", async () => {
    const used: string[] = [];
    const spy = new Proxy(fakeClient([]), {
      get: (t, k) => {
        used.push(String(k));
        return (t as never)[k];
      },
    });
    await draftIssue(spy, "o/r", input);
    expect(new Set(used)).toEqual(new Set(["listIssues"]));
  });
});

describe("input validation", () => {
  it("accepts a complete input", () => {
    expect(DraftIssueInput.safeParse(valid).success).toBe(true);
  });
  it.each(["problem", "motivation", "expectedBehavior", "technicalApproach", "testingRequirements", "title"])(
    "rejects an empty %s",
    (k) => {
      expect(DraftIssueInput.safeParse({ ...valid, [k]: "   " }).success).toBe(false);
    },
  );
  it("rejects missing criteria, too many labels and a bad repo", () => {
    expect(DraftIssueInput.safeParse({ ...valid, acceptanceCriteria: [] }).success).toBe(false);
    expect(DraftIssueInput.safeParse({ ...valid, labels: ["a", "b", "c", "d", "e", "f"] }).success).toBe(false);
    expect(DraftIssueInput.safeParse({ ...valid, repo: "../etc" }).success).toBe(false);
  });
});

describe("draft_issue tool", () => {
  it("returns a draft and never an error for a normal input", async () => {
    const server = createServer(process.cwd(), fakeClient([])) as unknown as {
      _registeredTools: Record<string, { handler?: Function; callback?: Function }>;
    };
    const t = server._registeredTools["draft_issue"]!;
    const res = (await (t.handler ?? t.callback)!(valid, {})) as { isError?: boolean; content: { text: string }[] };
    expect(res.isError).toBeUndefined();
    const body = JSON.parse(res.content[0]!.text);
    expect(body.status).toBe("draft");
    expect(body.note).toMatch(/Nothing was created/);
  });
});
