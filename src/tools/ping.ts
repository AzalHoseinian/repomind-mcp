import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { ping } from "../services/ping.js";

/** Thin layer: validate input, call the service, shape the MCP response. */
export function registerPingTool(server: McpServer): void {
  server.registerTool(
    "ping",
    {
      title: "Ping",
      description: "Health check. Returns pong, echoing an optional short message.",
      inputSchema: z.object({ message: z.string().max(200).optional() }),
    },
    async ({ message }) => {
      const result = ping(message);
      return { content: [{ type: "text", text: result.reply }] };
    },
  );
}
