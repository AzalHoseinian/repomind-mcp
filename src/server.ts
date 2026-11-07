#!/usr/bin/env node
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createServer } from "./createServer.js";

// stdout is the MCP wire: never console.log here, log to stderr only.
serveStdio(() => createServer(), {
  onerror: (err) => console.error("repomind-mcp error:", err.message),
});
