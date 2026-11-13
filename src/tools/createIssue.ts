import { McpServer } from "@modelcontextprotocol/server";
import type { IssueWriter } from "../github/issueWriter.js";
import { createIssue, type Confirm, type WriteSettings } from "../services/createIssue.js";
import { DraftIssueInput } from "./draftIssue.js";

/** The only way to confirm is the MCP elicitation prompt. There is no "confirmed" input field. */
export function elicitationConfirm(
  elicit: (params: unknown) => Promise<{ action: string; content?: Record<string, unknown> }>,
): Confirm {
  return async ({ repo, title, excerpt }) => {
    try {
      const res = await elicit({
        mode: "form",
        message: `Create this issue in ${repo}?\n\nTitle: ${title}\n\n${excerpt}`,
        requestedSchema: {
          type: "object",
          properties: { confirm: { type: "boolean", title: "Create this issue", default: false } },
          required: ["confirm"],
        },
      });
      if (res.action === "accept") return res.content?.["confirm"] === true ? "accept" : "decline";
      return res.action === "cancel" ? "cancel" : "decline";
    } catch {
      return "unsupported"; // no elicitation capability, or an era that rejects it: fail closed
    }
  };
}

export function registerCreateIssueTool(
  server: McpServer,
  writer: IssueWriter | undefined,
  settings: WriteSettings,
): void {
  server.registerTool(
    "create_issue",
    {
      title: "Create a GitHub issue",
      description:
        "Creates a GitHub issue ONLY if writes are enabled and the user explicitly confirms in a prompt " +
        "shown by the server. Use draft_issue first and show the draft to the user.",
      inputSchema: DraftIssueInput,
    },
    async ({ repo, ...input }, ctx) => {
      const confirm = elicitationConfirm((p) =>
        (ctx as unknown as { mcpReq: { elicitInput: (p: unknown) => Promise<never> } }).mcpReq.elicitInput(p),
      );
      const result = await createIssue(
        writer, repo, { ...input, ...(input.labels ? { labels: input.labels } : {}) }, settings, confirm,
      );
      return {
        isError: !result.created,
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: { ...result },
      };
    },
  );
}
