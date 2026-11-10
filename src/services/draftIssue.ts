import type { IssuesClient } from "../github/issuesClient.js";
import { findDuplicates, type DuplicateCandidate } from "./findDuplicates.js";

export interface DraftInput {
  title: string;
  problem: string;
  motivation: string;
  expectedBehavior: string;
  technicalApproach: string;
  acceptanceCriteria: string[];
  testingRequirements: string;
  labels?: string[];
}

export interface DraftResult {
  status: "draft";
  note: string;
  title: string;
  labels: string[];
  markdown: string;
  duplicateCheck: "done" | "skipped";
  possibleDuplicates: DuplicateCandidate[];
}

/**
 * User text is data. A line starting with "#" (any heading level) is escaped so a field
 * cannot open its own section and break the fixed structure.
 */
export function escapeHeadings(text: string): string {
  return text
    .split("\n")
    .map((line) => (/^\s{0,3}#/.test(line) ? "\\" + line.trimStart() : line))
    .join("\n")
    .trim();
}

export function renderMarkdown(input: DraftInput): string {
  const criteria = input.acceptanceCriteria
    .map((c, i) => `${i + 1}. ${escapeHeadings(c).replace(/\n+/g, " ")}`)
    .join("\n");
  return [
    "## Problem", escapeHeadings(input.problem),
    "## Motivation", escapeHeadings(input.motivation),
    "## Expected behavior", escapeHeadings(input.expectedBehavior),
    "## Technical approach", escapeHeadings(input.technicalApproach),
    "## Acceptance criteria", criteria,
    "## Testing requirements", escapeHeadings(input.testingRequirements),
  ].join("\n\n") + "\n";
}

export async function draftIssue(
  client: IssuesClient,
  ownerRepo: string,
  input: DraftInput,
): Promise<DraftResult> {
  let possibleDuplicates: DuplicateCandidate[] = [];
  let duplicateCheck: DraftResult["duplicateCheck"] = "done";
  try {
    possibleDuplicates = await findDuplicates(client, ownerRepo, {
      title: input.title,
      body: input.problem,
      threshold: 0.3,
      limit: 5,
    });
  } catch {
    duplicateCheck = "skipped"; // best effort: a GitHub failure must not block drafting
  }
  return {
    status: "draft",
    note: "Nothing was created on GitHub. Show this draft to the user and wait for explicit approval.",
    title: input.title.trim(),
    labels: input.labels ?? [],
    markdown: renderMarkdown(input),
    duplicateCheck,
    possibleDuplicates,
  };
}
