import { McpServer } from "@modelcontextprotocol/server";
import type { IssueWriter } from "./github/issueWriter.js";
import type { WriteSettings } from "./services/createIssue.js";
import type { IssuesClient } from "./github/issuesClient.js";
import { registerAnalyzeRepoTool } from "./tools/analyzeRepo.js";
import { registerCreateIssueTool } from "./tools/createIssue.js";
import { registerDraftIssueTool } from "./tools/draftIssue.js";
import { registerFindDuplicateIssuesTool } from "./tools/findDuplicateIssues.js";
import { registerListIssuesTool } from "./tools/listIssues.js";
import { registerPingTool } from "./tools/ping.js";

export interface WriteOptions {
  writer?: IssueWriter;
  settings: WriteSettings;
}

const WRITES_OFF: WriteOptions = { settings: { enabled: false, hasToken: false, allowedRepos: [] } };

export function createServer(
  workspace: string,
  issuesClient: IssuesClient,
  writes: WriteOptions = WRITES_OFF,
): McpServer {
  const server = new McpServer(
    { name: "repomind-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );
  registerPingTool(server);
  registerAnalyzeRepoTool(server, workspace);
  registerListIssuesTool(server, issuesClient);
  registerFindDuplicateIssuesTool(server, issuesClient);
  registerDraftIssueTool(server, issuesClient);
  registerCreateIssueTool(server, writes.writer, writes.settings);
  return server;
}
