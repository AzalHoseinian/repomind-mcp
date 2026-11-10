import { McpServer } from "@modelcontextprotocol/server";
import type { IssuesClient } from "./github/issuesClient.js";
import { registerAnalyzeRepoTool } from "./tools/analyzeRepo.js";
import { registerDraftIssueTool } from "./tools/draftIssue.js";
import { registerFindDuplicateIssuesTool } from "./tools/findDuplicateIssues.js";
import { registerListIssuesTool } from "./tools/listIssues.js";
import { registerPingTool } from "./tools/ping.js";

export function createServer(workspace: string, issuesClient: IssuesClient): McpServer {
  const server = new McpServer(
    { name: "repomind-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );
  registerPingTool(server);
  registerAnalyzeRepoTool(server, workspace);
  registerListIssuesTool(server, issuesClient);
  registerFindDuplicateIssuesTool(server, issuesClient);
  registerDraftIssueTool(server, issuesClient);
  return server;
}
