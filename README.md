# repomind-mcp

An MCP (Model Context Protocol) server that helps AI coding agents understand
repositories, analyze issues and plan changes safely.

> Status: early scaffold. The only tool today is `ping`.

## Development

Requires Node 20+ and pnpm.

```bash
pnpm install
pnpm build
pnpm test
```

Run the server over stdio: `node dist/server.js`

## Layout

- `src/tools/` – thin MCP tool handlers (validate input, call a service)
- `src/services/` – business logic, no MCP types
- `src/config/` – configuration (env based, no secrets in the repo)
- `tests/` – Vitest tests

## License

MIT
