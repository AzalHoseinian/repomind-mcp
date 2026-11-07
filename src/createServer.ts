import { McpServer } from "@modelcontextprotocol/server";
import { registerPingTool } from "./tools/ping.js";

export function createServer(): McpServer {
  const server = new McpServer(
    { name: "repomind-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );
  registerPingTool(server);
  return server;
}
