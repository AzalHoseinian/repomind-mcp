import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { IssuesClient } from "../github/issuesClient.js";
import { draftIssue } from "../services/draftIssue.js";
import { RepoSchema } from "./listIssues.js";

const Section = z.string().trim().min(1).max(3000);

export const DraftIssueInput = z.object({
  repo: RepoSchema,
  title: z.string().trim().min(1).max(200),
  problem: Section,
  motivation: Section,
  expectedBehavior: Section,
  technicalApproach: Section,
  acceptanceCriteria: z.array(z.string().trim().min(1).max(500)).min(1).max(20),
  testingRequirements: Section,
  labels: z.array(z.string().trim().min(1).max(50)).max(5).optional(),
});

export function registerDraftIssueTool(server: McpServer, client: IssuesClient): void {
  server.registerTool(
    "draft_issue",
    {
      title: "Draft a GitHub issue",
      description:
        "Builds a structured issue draft (problem, motivation, expected behavior, technical approach, " +
        "acceptance criteria, testing requirements) and checks for possible duplicates. " +
        "It NEVER creates anything on GitHub: show the draft to the user and wait for explicit approval.",
      inputSchema: DraftIssueInput,
    },
    async ({ repo, ...input }) => {
      const draft = await draftIssue(client, repo, {
        ...input,
        ...(input.labels ? { labels: input.labels } : {}),
      });
      return {
        content: [{ type: "text", text: JSON.stringify(draft, null, 2) }],
        structuredContent: { ...draft },
      };
    },
  );
}
