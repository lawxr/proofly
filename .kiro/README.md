# Visual checks in Kiro

Use the workspace `playwright` MCP tools for visual checks instead of launching
Playwright from Kiro's sandboxed shell. This does not fix `npm run test:browser`
inside that shell.

## Quick path

1. Open this Proofly workspace in Kiro. MCP configuration reconnects automatically
   after saving; reconnect `playwright` in the MCP panel if necessary.
2. Start the app with its existing development command.
3. Use `browser_navigate` with the local app URL, then `browser_snapshot` and
   `browser_take_screenshot`. Use `browser_resize` for desktop and mobile checks.

Screenshots and browser logs default to `.kiro/artifacts/playwright/`, which is
ignored by Git. Browser storage is discarded when the browser closes; sign in
with a test account each session if the app requires authentication.

## Scope and permissions

- Requires this Mac's Homebrew `npx` and installed Google Chrome. The MCP package
  is pinned to `0.0.84` and cached by npm, not added to app dependencies.
- The server uses stdio, an isolated headless profile, and Chrome's internal
  sandbox. It does not attach to your normal Chrome session.
- Kiro's global shell sandbox remains enabled. Local MCP processes run outside
  that shell sandbox by default and have the host user's privileges. A workspace
  configuration is not process isolation.
- Only the listed browser interaction and inspection tools are preapproved.
  Code evaluation, arbitrary Playwright code, file upload, and browser install
  tools are hidden from Kiro. Page-provided WebMCP tools are disabled.
- Use local/test accounts. Do not publish, transfer private data, or perform
  irreversible account actions without explicit user authorization.

References: [Kiro configuration](https://kiro.dev/docs/mcp/configuration/),
[Kiro MCP security](https://kiro.dev/docs/mcp/security/),
[Playwright MCP](https://github.com/microsoft/playwright-mcp).
