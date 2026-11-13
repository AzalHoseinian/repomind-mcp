import type { IssueWriter } from "../github/issueWriter.js";
import { GitHubError } from "../github/issuesClient.js";
import { renderMarkdown, type DraftInput } from "./draftIssue.js";

export interface WriteSettings {
  enabled: boolean;
  hasToken: boolean;
  /** Empty means "any repo". */
  allowedRepos: string[];
}

export type ConfirmAnswer = "accept" | "decline" | "cancel" | "unsupported";
export interface ConfirmSummary {
  repo: string;
  title: string;
  excerpt: string;
}
/** Asks the human. Injected so tests can fake it and the real one uses MCP elicitation. */
export type Confirm = (summary: ConfirmSummary) => Promise<ConfirmAnswer>;

export type CreateIssueResult =
  | { created: true; number: number; url: string }
  | {
      created: false;
      reason:
        | "writes_disabled" | "no_token" | "repo_not_allowed"
        | "confirmation_unsupported" | "declined" | "cancelled" | "github_error";
      message: string;
    };

const refuse = (
  reason: Extract<CreateIssueResult, { created: false }>["reason"],
  message: string,
): CreateIssueResult => ({ created: false, reason, message });

export async function createIssue(
  writer: IssueWriter | undefined,
  ownerRepo: string,
  input: DraftInput,
  settings: WriteSettings,
  confirm: Confirm,
): Promise<CreateIssueResult> {
  if (!settings.enabled) return refuse("writes_disabled", "Writes are disabled. Set REPOMIND_ALLOW_WRITES=true to enable.");
  if (!settings.hasToken || !writer) return refuse("no_token", "GITHUB_TOKEN is required to create issues.");
  if (settings.allowedRepos.length > 0 && !settings.allowedRepos.includes(ownerRepo.toLowerCase()))
    return refuse("repo_not_allowed", `Repository ${ownerRepo} is not in REPOMIND_WRITE_REPOS.`);

  const body = renderMarkdown(input);
  const title = input.title.trim();

  // Confirm immediately before the write, showing exactly what will be sent.
  const answer = await confirm({ repo: ownerRepo, title, excerpt: body.slice(0, 300) });
  if (answer === "unsupported")
    return refuse("confirmation_unsupported", "The client cannot show a confirmation prompt, so nothing was created.");
  if (answer === "decline") return refuse("declined", "The user declined. Nothing was created.");
  if (answer === "cancel") return refuse("cancelled", "The user cancelled. Nothing was created.");

  const [owner, repo] = ownerRepo.split("/") as [string, string];
  try {
    const { number, url } = await writer.createIssue(owner, repo, { title, body, labels: input.labels ?? [] });
    return { created: true, number, url };
  } catch (err) {
    return refuse("github_error", err instanceof GitHubError ? `[${err.kind}] ${err.message}` : "GitHub request failed.");
  }
}
