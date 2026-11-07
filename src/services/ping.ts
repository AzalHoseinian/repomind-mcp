/** Business logic lives here. No MCP or GitHub types, so it is trivially testable. */
export function ping(message?: string): { reply: string } {
  return { reply: message ? `pong: ${message}` : "pong" };
}
