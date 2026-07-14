# server — Detail

## Requirements

- Initialize the MCP server and register all 18 tool handlers.
- Wrap every handler with `wrapHandler` so thrown errors become `toolError`
  responses and successful results pass through `toolResult`.
- Convert `Map` instances inside handler results to plain objects via
  `mapReplacer` during JSON serialization (consumers cannot read native Maps
  across the MCP transport).
- Own the per-session cache lifecycle (replaces the removed SessionEnd hook —
  the MCP server process is the only session-end signal common to all hosts):
  - **Boot sweep** (`bootSweep(cwd?)`): after transport connect, run the same
    daily-throttled maintenance as the SessionStart hook
    (`isSessionPruneDue` → `pruneOldSessions`, `isPruneDue` →
    `pruneStaleCacheDirs`). Marker gates are mtime-based and shared across
    processes, so a double run (hook + server) stays a no-op. The
    session-scoped prune is project-scoped: it runs only when
    `tryProjectRoot(cwd)` resolves, and is skipped otherwise. The
    stale-cache prune needs no root and always runs. Best-effort: absorb
    every exception; never block or fail server boot.
  - **Shutdown cleanup** (`registerShutdown` → `cleanupOwnSessionCache`): on
    `exit`/`SIGINT`/`SIGTERM`, synchronously remove this session's cache
    files via `removeSessionFiles(CLAUDE_CODE_SESSION_ID, tryProjectRoot())`.
    The host kills the process ~400ms after SIGINT (measured), so the handler
    must be strictly synchronous. `CLAUDE_CODE_SESSION_ID` is an undocumented
    env var: when absent, skip — the boot sweep covers the files by TTL.
    Skip likewise when no project root resolves. Register handlers once;
    never let a cleanup failure affect the exit path.

## API Contracts

### `toolResult(result)`

```ts
function toolResult(result: unknown): {
  content: [{ type: 'text'; text: string }];
};
```

- Emits **compact JSON** (no indentation) by default.
- Honors `FILID_PRETTY_JSON=1` to opt back into 2-space indent for human-side
  debugging via stderr/log capture.
- Pretty-printing inflated every response by ~30% with no LLM benefit; JSON
  parsers ignore whitespace and tokenizers count it.

### `toolError(err)`

```ts
function toolError(err: unknown): {
  content: [{ type: 'text'; text: string }];
  isError: true;
};
```

- Always returns `isError: true`.
- Produces `Error: <message>` text.

### `wrapHandler(fn, options?)`

- Catches thrown errors and converts to `toolError`.
- When `options.checkErrorField` is set, treats a result with a non-empty
  `error` field as an error response.
