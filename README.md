# repomind-mcp

An MCP (Model Context Protocol) server that helps AI coding agents understand
repositories, analyze issues and plan changes safely.

> Status: early. Tools: `ping`, `analyze_repo` (read-only: languages, manifests, top-level structure), `list_issues` (read-only GitHub issues), `find_duplicate_issues` (read-only, ranks existing issues by word similarity to a draft).

## Development

Requires Node 20+ and pnpm.

```bash
pnpm install
pnpm build
pnpm test
```

Run the server over stdio:

```bash
REPOMIND_WORKSPACE=/absolute/path/to/your/projects node dist/server.js
```

`REPOMIND_WORKSPACE` is required. `GITHUB_TOKEN` is optional (use a fine-grained token with read-only Issues permission; without it public repos work with a low rate limit). File access is confined to this directory
(`../`, absolute paths outside it, and symlinks that escape it are rejected).

## Layout

- `src/tools/` – thin MCP tool handlers (validate input, call a service)
- `src/services/` – business logic, no MCP types
- `src/config/` – configuration (env based, no secrets in the repo)
- `src/workspace/` – path confinement helpers
- `tests/` – Vitest tests

## License

MIT
