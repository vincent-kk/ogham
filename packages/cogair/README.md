# @ogham/cogair

A Claude Code plugin that lets Claude delegate work to **OpenAI Codex CLI** or **Google Gemini CLI** through three MCP tools, four user-invocable skills, and two lifecycle hooks.

Where `atlassian` or `filid` encapsulate domain knowledge, cogair is a **delegation surface**: Claude decides when another model family fits better (heavy code → codex; live web search → gemini) and the plugin handles session bookkeeping, ratio tracking, and per-session call counters.

---

## Installation

### Via Marketplace (Recommended)

```bash
# 1. Register the marketplace
claude plugin marketplace add https://github.com/vincent-kk/ogham

# 2. Install the plugin
claude plugin install cogair
```

All components (MCP, Skills, Hooks) register automatically.

### Local Development

```bash
yarn install
cd packages/cogair
yarn build
claude --plugin-dir ./packages/cogair
```

Building produces `bridge/mcp-server.cjs`, `bridge/injectStatic.mjs`, and `bridge/injectDynamic.mjs`.

### Prerequisites

The plugin shells out to external CLIs that you must install and authenticate yourself:

- `codex` (OpenAI Codex CLI) — run `codex login`
- `gemini` (Google Gemini CLI) — run `gemini auth login`

cogair never installs or logs in for you. When auth is missing the failure response carries `error.code: 'auth'` and the skill instructs you to run the appropriate login command.

---

## How to Use

### Initial Settings

```
/setup
```

Opens a local web UI to configure provider ratio (target % per provider, plus a per-provider enable toggle), intervention strength (`-2` … `+2`), keyword routing hints, default model alias, and default options. The UI runs on `127.0.0.1` with a one-time token and auto-shuts down after 5 minutes idle.

### Delegating to Codex

```
/codex -- "Refactor the OTP flow in src/auth into a state machine"
/codex --model high -- "Long-running sandboxed refactor task"
/codex --continue <session_id> -- "Now produce the diff for module B"
```

Use codex for heavy code generation, refactoring, sandboxed shell work, or a second opinion from a different model family.

### Delegating to Gemini

```
/gemini -- "Summarize the latest Next.js 15 release notes"
/gemini --model high -- "Compare these three RFC drafts"
/gemini --continue <session_id> -- "Extend that analysis to ..."
```

Use gemini for live web-grounded research, very-large-context synthesis, YouTube/URL ingestion, or knowledge past Claude's cutoff.

### Cross-checking with Both Providers

```
/crosscheck -- "Is approach A or B safer for this migration?"
/crosscheck --model high -- "Review this RFC from both code and research angles"
```

Use crosscheck when independent second opinions from two model families matter (architectural decisions, spec/PR reviews). The same prompt is forwarded to BOTH codex and gemini in parallel; the answers are synthesized into Agreed / Conflicting / Final direction / Action checklist sections. Single-shot only — use `/codex --continue` or `/gemini --continue` for multi-turn follow-ups on either side.

---

## Architecture

```
Claude Code session
   │
   ├── Skills (/setup, /codex, /gemini, /crosscheck)    Layer 3 (user) — thin tool-call mappers
   │       │
   │       ▼
   ├── MCP "tools" server                       Layer 2 (logic) — 3 MCP tools
   │       │
   │       ▼
   ├── Dispatcher (codex / gemini)              spawn external CLI + parse output
   │       │
   │       ▼
   ├── Core storage                             ~/.claude/plugins/cogair/...
   │
   └── Hooks (SessionStart, UserPromptSubmit)   Layer 1 (auto) — read-only context injection
```

Single-layer dispatch — no agents between skills and the MCP server. Hooks are isolated thin scripts that never import `src/core/` or `src/types/` (zod and the MCP SDK would blow the bundle budget).

### MCP Tools

| Tool                    | Purpose                                                                   |
| ----------------------- | ------------------------------------------------------------------------- |
| `start_conversation`    | Spawn `codex` or `gemini` with a prompt and return a normalized envelope. |
| `continue_conversation` | Resume an existing session by `session_id` (project-hash-scoped).         |
| `open_settings`         | Start the local settings UI and return its URL with a one-time token.     |

### Skills

| Skill         | Trigger keywords                                         |
| ------------- | -------------------------------------------------------- |
| `/setup`      | "cogair 설정", "open cogair settings", "개입 강도"       |
| `/codex`      | "ask codex", "codex 호출", "코덱스에게"                  |
| `/gemini`     | "ask gemini", "gemini 호출", "제미니에게"                |
| `/crosscheck` | "crosscheck", "cross check", "교차검증", "양쪽에 물어봐" |

#### Name collision policy

`/setup`, `/codex`, `/gemini`, and `/crosscheck` are registered globally without a plugin prefix. When another plugin claims the same name, Claude Code's skill-resolution order (plugin registration order) decides which one wins — the earlier registration takes priority. If you suspect a collision, list the active skills with `claude config`, or invoke the namespaced form (e.g. `cogair:setup`).

### Hooks

| Event              | Bridge bundle       | Injects                                                                      |
| ------------------ | ------------------- | ---------------------------------------------------------------------------- |
| `SessionStart`     | `injectStatic.mjs`  | Provider ratio, tone phrase, keyword map, routing guidance.                  |
| `UserPromptSubmit` | `injectDynamic.mjs` | Per-session call counter, current vs. target ratio, drift, parent-PID aware. |

Both hook bundles currently land near 3.3 KB minified and use only Node builtins — no zod, no MCP SDK, no glob libs. The build guard enforces a 10 KB LIGHT-tier cap.

---

## Disk Layout

cogair stores all state under `~/.claude/plugins/cogair/`:

```
~/.claude/plugins/cogair/
├── config.json                    # user settings
├── runtime/
│   ├── counter.json               # per-parent-PID call counter
│   └── settings_server.json       # live settings UI state (during a session)
└── sessions/
    └── <project_hash>/            # sha256(cwd).slice(0, 12)
        └── <session_id>.json
```

Sessions are project-scoped: `continue_conversation` from a different `cwd` returns `error.code: 'unknown'` instead of leaking session state across projects.

---

## Model Aliases

Each provider exposes four tier aliases. Concrete model IDs live only in the dispatcher (`src/dispatcher/<provider>/modelAlias.ts`) so upstream CLI renames stay scoped to one file.

| alias  | meaning                       |
| ------ | ----------------------------- |
| `high` | provider's most capable model |
| `mid`  | balanced model                |
| `low`  | fastest / cheapest model      |
| `auto` | CLI default (omit `-m`)       |

Env overrides: `COGAIR_CODEX_{HIGH,MID,LOW}`, `COGAIR_GEMINI_{HIGH,MID,LOW}`.

---

## Development

```bash
yarn dev            # TypeScript watch
yarn test           # Vitest watch
yarn test:run       # Single run (CI)
yarn typecheck      # Type-check (no emit)
yarn build          # clean → version:sync → settingsHtml → tsc → mcpServer → hooks
```

### Tech Stack

TypeScript 5.7, @modelcontextprotocol/sdk, esbuild, Vitest, Zod.

---

## Documentation

For technical details and design rationale, see [`.metadata/cogair/`](../../.metadata/cogair/):

| Document                                                         | Content                                         |
| ---------------------------------------------------------------- | ----------------------------------------------- |
| [README](../../.metadata/cogair/README.md)                       | Spec index + core decisions                     |
| [spec](../../.metadata/cogair/spec.md)                           | Responsibilities, data flow, non-goals          |
| [architecture](../../.metadata/cogair/architecture.md)           | Module tree + dependency direction + build flow |
| [mcp-tools](../../.metadata/cogair/mcp-tools.md)                 | 3 MCP tools (input schema, behavior, envelope)  |
| [skills](../../.metadata/cogair/skills.md)                       | Skill body + tool-call mapping                  |
| [hooks](../../.metadata/cogair/hooks.md)                         | SessionStart / UserPromptSubmit injection       |
| [provider-dispatch](../../.metadata/cogair/provider-dispatch.md) | codex-cli / gemini-cli invocation matrix        |
| [storage](../../.metadata/cogair/storage.md)                     | Disk layout under `~/.claude/plugins/cogair/`   |
| [web-ui](../../.metadata/cogair/web-ui.md)                       | Local settings UI design                        |
| [roadmap](../../.metadata/cogair/roadmap.md)                     | Phase-by-phase implementation plan              |

[Korean documentation (README-ko_kr.md)](./README-ko_kr.md) is also available.

---

## License

MIT
