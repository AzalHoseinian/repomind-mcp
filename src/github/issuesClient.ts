import { Octokit } from "@octokit/rest";

export interface RawIssue {
  number: number;
  title: string;
  state: string;
  labels: string[];
  author: string | null;
  createdAt: string;
  updatedAt: string;
  comments: number;
  url: string;
  body: string | null;
  isPullRequest: boolean;
}

export interface ListIssuesOptions {
  state: "open" | "closed" | "all";
  limit: number;
}

/** The only thing the rest of the app knows about GitHub. Swap or fake it in tests. */
export interface IssuesClient {
  listIssues(owner: string, repo: string, opts: ListIssuesOptions): Promise<RawIssue[]>;
}

export class GitHubError extends Error {
  constructor(
    readonly kind: "not_found" | "rate_limited" | "unauthorized" | "forbidden" | "unknown",
    message: string,
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

/** Maps an Octokit error to a GitHubError. Never includes headers or the token. */
export function mapGitHubError(err: unknown): GitHubError {
  const e = err as { status?: number; response?: { headers?: Record<string, string> } };
  switch (e?.status) {
    case 404:
      return new GitHubError("not_found", "Repository not found (or not visible with the current token).");
    case 401:
      return new GitHubError("unauthorized", "GitHub rejected the credentials. Check GITHUB_TOKEN.");
    case 403:
    case 429:
      return e.response?.headers?.["x-ratelimit-remaining"] === "0" || e.status === 429
        ? new GitHubError("rate_limited", "GitHub rate limit reached. Set GITHUB_TOKEN or retry later.")
        : new GitHubError("forbidden", "Access to this repository's issues is forbidden.");
    default:
      return new GitHubError("unknown", "GitHub request failed.");
  }
}

export function createOctokitIssuesClient(token?: string): IssuesClient {
  const octokit = new Octokit(token ? { auth: token } : {});
  return {
    async listIssues(owner, repo, { state }) {
      try {
        // The issues endpoint also returns PRs, so ask for a full page and filter later.
        const res = await octokit.rest.issues.listForRepo({
          owner, repo, state, per_page: 100, sort: "updated", direction: "desc",
        });
        return res.data.map((i) => ({
          number: i.number,
          title: i.title,
          state: i.state,
          labels: i.labels.map((l) => (typeof l === "string" ? l : (l.name ?? ""))).filter(Boolean),
          author: i.user?.login ?? null,
          createdAt: i.created_at,
          updatedAt: i.updated_at,
          comments: i.comments,
          url: i.html_url,
          body: i.body ?? null,
          isPullRequest: Boolean(i.pull_request),
        }));
      } catch (err) {
        throw mapGitHubError(err);
      }
    },
  };
}
