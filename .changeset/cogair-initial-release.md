---
"@ogham/cogair": minor
---

Initial release.

`@ogham/cogair` is a Claude Code plugin that lets Claude delegate work to OpenAI Codex CLI or Google Gemini CLI from inside any session.

- **3 MCP tools** — `start_conversation`, `continue_conversation`, `open_settings`. Sessions are project-hash-scoped (`sha256(cwd).slice(0, 12)`) so `continue_conversation` from a different cwd returns `error.code: 'unknown'` rather than leaking state across projects.
- **3 user-invocable skills** — `/setup` (opens the local settings UI), `/codex` (delegate to Codex CLI), `/gemini` (delegate to Gemini CLI). Skills are thin tool-call mappers; model IDs and CLI option details live in the dispatcher, never the skill body.
- **2 lifecycle hooks** — `SessionStart` injects the static policy (provider ratio, intervention strength, keyword map, routing guidance); `UserPromptSubmit` injects the live call counter, current/target ratio, and drift. Both bundles are < 4 KB minified and pull only Node builtins (no zod, no MCP SDK).
- **Local settings web UI** — `127.0.0.1` server with a one-time token, 5-minute idle shutdown, served from `open_settings`. Edits ratio (percentage + per-provider enable toggle), intervention strength, keywords, and default options.
- **Single source of truth for model IDs** — `src/dispatcher/<provider>/modelAlias.ts`. Skill / README / CLAUDE.md describe tiers (`high` / `mid` / `low` / `auto`), never concrete model strings, so upstream CLI renames stay scoped to one file. Env overrides: `COGAIR_CODEX_{HIGH,MID,LOW}`, `COGAIR_GEMINI_{HIGH,MID,LOW}`.

External `codex` and `gemini` CLIs must be installed and authenticated separately.
