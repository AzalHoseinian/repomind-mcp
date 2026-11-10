import type { IssuesClient, ListIssuesOptions } from "../github/issuesClient.js";

export const EXCERPT_MAX = 500;

export interface IssueSummary {
  number: number;
  title: string;
  state: string;
  labels: string[];
  author: string | null;
  createdAt: string;
  updatedAt: string;
  comments: number;
  url: string;
  bodyExcerpt: string;
}

/** Issue text is untrusted data: it is returned as plain fields and never interpreted. */
export async function listIssues(
  client: IssuesClient,
  ownerRepo: string,
  opts: ListIssuesOptions,
): Promise<IssueSummary[]> {
  const [owner, repo] = ownerRepo.split("/") as [string, string];
  const raw = await client.listIssues(owner, repo, opts);
  return raw
    .filter((i) => !i.isPullRequest)
    .slice(0, opts.limit)
    .map(({ body, isPullRequest: _pr, ...rest }) => ({
      ...rest,
      bodyExcerpt: (body ?? "").slice(0, EXCERPT_MAX),
    }));
}
