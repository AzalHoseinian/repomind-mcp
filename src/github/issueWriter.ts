import { Octokit } from "@octokit/rest";
import { GitHubError, mapGitHubError } from "./issuesClient.js";

export interface NewIssue {
  title: string;
  body: string;
  labels: string[];
}

/** Deliberately separate from IssuesClient: read-only tools can never gain write ability. */
export interface IssueWriter {
  createIssue(owner: string, repo: string, issue: NewIssue): Promise<{ number: number; url: string }>;
}

export function createOctokitIssueWriter(token: string): IssueWriter {
  const octokit = new Octokit({ auth: token });
  return {
    async createIssue(owner, repo, issue) {
      try {
        const res = await octokit.rest.issues.create({
          owner, repo, title: issue.title, body: issue.body, labels: issue.labels,
        });
        return { number: res.data.number, url: res.data.html_url };
      } catch (err) {
        throw err instanceof GitHubError ? err : mapGitHubError(err);
      }
    },
  };
}
