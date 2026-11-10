import type { IssuesClient, RawIssue } from "../src/github/issuesClient.js";

export const noIssues: IssuesClient = { listIssues: async () => [] };

export function fakeClient(issues: Partial<RawIssue>[]): IssuesClient {
  return {
    listIssues: async () =>
      issues.map((i, n) => ({
        number: n + 1, title: `t${n}`, state: "open", labels: [], author: "u",
        createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-02T00:00:00Z",
        comments: 0, url: `https://github.com/o/r/issues/${n + 1}`, body: null,
        isPullRequest: false, ...i,
      })),
  };
}
