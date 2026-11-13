#!/usr/bin/env node
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { ConfigError, loadConfig } from "./config/config.js";
import { createOctokitIssueWriter } from "./github/issueWriter.js";
import { createOctokitIssuesClient } from "./github/issuesClient.js";
import { createServer } from "./createServer.js";

// stdout is the MCP wire: never console.log here, log to stderr only.
let config;
try {
  config = loadConfig(process.env);
} catch (err) {
  if (err instanceof ConfigError) {
    console.error(`repomind-mcp: ${err.message}`);
    process.exit(1);
  }
  throw err;
}

const writes = {
  ...(config.githubToken ? { writer: createOctokitIssueWriter(config.githubToken) } : {}),
  settings: {
    enabled: config.allowWrites,
    hasToken: Boolean(config.githubToken),
    allowedRepos: config.writeRepos,
  },
};

serveStdio(() => createServer(config.workspace, createOctokitIssuesClient(config.githubToken), writes), {
  onerror: (err) => console.error("repomind-mcp error:", err.message),
});
