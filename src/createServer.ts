import { McpServer } from "@modelcontextprotocol/server";
import { registerAnalyzeRepoTool } from "./tools/analyzeRepo.js";
import { registerPingTool } from "./tools/ping.js";

export function createServer(workspace: string): McpServer {
  const server = new McpServer(
    { name: "repomind-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );
  registerPingTool(server);
  registerAnalyzeRepoTool(server, workspace);
  return server;
}
