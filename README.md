# repomind-mcp

An MCP (Model Context Protocol) server that helps AI coding agents understand
repositories, analyze issues and plan changes safely.

> Status: early. Tools: `ping`, `analyze_repo` (read-only: languages, manifests, top-level structure), `list_issues` (read-only GitHub issues), `find_duplicate_issues` (read-only, ranks existing issues by word similarity to a draft), `draft_issue` (builds a structured issue draft + duplicate check; never creates anything), `create_issue` (writes; see below).

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

## Creating issues (write access)

`create_issue` is the only tool that writes to GitHub, and it is locked down:

- Off by default. Enable with `REPOMIND_ALLOW_WRITES=true`.
- Needs `GITHUB_TOKEN` (fine-grained, Issues read/write on the specific repo only).
- Optional allowlist: `REPOMIND_WRITE_REPOS=owner/name,other/name`.
- The server asks the user to confirm through an MCP elicitation prompt right before
  writing, showing the repo, title and start of the body. There is no "confirmed"
  input a model could set. If the client cannot show the prompt, nothing is created.

Known limit: confirmation uses the 2025-style elicitation request. On a 2026-07-28 era
connection it fails closed (nothing is created) until the newer `inputRequired` flow is added.
