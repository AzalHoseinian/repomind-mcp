import type { IssuesClient } from "../github/issuesClient.js";
import { score, shared, tokenize } from "./similarity.js";

export interface DuplicateCandidate {
  number: number;
  title: string;
  state: string;
  url: string;
  score: number;
  sharedKeywords: string[];
}

export interface FindDuplicatesInput {
  title: string;
  body?: string;
  threshold: number;
  limit: number;
}

/** All issue text is untrusted: it is only tokenized and counted, never executed. */
export async function findDuplicates(
  client: IssuesClient,
  ownerRepo: string,
  input: FindDuplicatesInput,
): Promise<DuplicateCandidate[]> {
  const [owner, repo] = ownerRepo.split("/") as [string, string];
  const existing = await client.listIssues(owner, repo, { state: "all", limit: 100 });
  const draft = { title: tokenize(input.title), body: tokenize(input.body ?? "") };
  const draftAll = new Set([...draft.title, ...draft.body]);

  return existing
    .filter((i) => !i.isPullRequest)
    .map((i) => {
      const other = { title: tokenize(i.title), body: tokenize((i.body ?? "").slice(0, 500)) };
      const otherAll = new Set([...other.title, ...other.body]);
      return {
        number: i.number,
        title: i.title,
        state: i.state,
        url: i.url,
        score: Math.round(score(draft, other) * 1000) / 1000,
        sharedKeywords: shared(draftAll, otherAll).slice(0, 10),
      };
    })
    .filter((c) => c.score >= input.threshold && c.score > 0)
    .sort((a, b) => b.score - a.score || a.number - b.number)
    .slice(0, input.limit);
}
