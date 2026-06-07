# server — Detail

## Requirements

- Initialize the MCP server and register all 18 tool handlers.
- Wrap every handler with `wrapHandler` so thrown errors become `toolError`
  responses and successful results pass through `toolResult`.
- Convert `Map` instances inside handler results to plain objects via
  `mapReplacer` during JSON serialization (consumers cannot read native Maps
  across the MCP transport).

## API Contracts

### `toolResult(result)`

```ts
function toolResult(result: unknown): { content: [{ type: 'text'; text: string }] }
```

- Emits **compact JSON** (no indentation) by default.
- Honors `FILID_PRETTY_JSON=1` to opt back into 2-space indent for human-side
  debugging via stderr/log capture.
- Pretty-printing inflated every response by ~30% with no LLM benefit; JSON
  parsers ignore whitespace and tokenizers count it.

### `toolError(err)`

```ts
function toolError(err: unknown): { content: [{ type: 'text'; text: string }]; isError: true }
```

- Always returns `isError: true`.
- Produces `Error: <message>` text.

### `wrapHandler(fn, options?)`

- Catches thrown errors and converts to `toolError`.
- When `options.checkErrorField` is set, treats a result with a non-empty
  `error` field as an error response.
