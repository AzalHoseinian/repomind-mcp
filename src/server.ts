#!/usr/bin/env node
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { ConfigError, loadConfig } from "./config/config.js";
import { createServer } from "./createServer.js";

// stdout is the MCP wire: never console.log here, log to stderr only.
try {
  loadConfig(process.env);
} catch (err) {
  if (err instanceof ConfigError) {
    console.error(`repomind-mcp: ${err.message}`);
    process.exit(1);
  }
  throw err;
}

serveStdio(() => createServer(), {
  onerror: (err) => console.error("repomind-mcp error:", err.message),
});
