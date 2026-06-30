# @ogham/cennad

> **Renamed from `cogair`.** This plugin was previously published as `cogair`. With the rename, the old `/cogair:*` skills, the `cogair` MCP server, and the on-disk settings at `~/.claude/plugins/cogair/` no longer apply — there is no automatic migration. Reinstall as `cennad` and run `/cennad:setup` to reconfigure your provider ratio, keywords, and options.

A Claude Code plugin that lets Claude delegate work to **OpenAI Codex CLI**, **Google Antigravity CLI**, or **Anthropic Claude CLI** through three MCP tools, five user-invocable skills, and two lifecycle hooks.

Where `atlassian` or `filid` encapsulate domain knowledge, cennad is a **delegation surface**: Claude decides when another model family fits better (heavy code → codex; live web search → antigravity) and the plugin handles session bookkeeping, ratio tracking, and per-session call counters.

---

## Installation

### Via Marketplace (Recommended)

```bash
# 1. Register the marketplace
claude plugin marketplace add https://github.com/vincent-kk/ogham

# 2. Install the plugin
claude plugin install cennad
```

All components (MCP, Skills, Hooks) register automatically.

### Local Development

```bash
yarn install
cd plugins/cennad
yarn build
claude --plugin-dir ./plugins/cennad
```

Building produces `bridge/mcp-server.cjs`, `bridge/injectStatic.mjs`, and `bridge/injectDynamic.mjs`.

### Prerequisites

The plugin shells out to external CLIs that you must install and authenticate yourself:

- `codex` (OpenAI Codex CLI) — run `codex login`
- `agy` (Google Antigravity CLI) — install with `curl -fsSL https://antigravity.google/cli/install.sh | bash`, then sign in by running `agy` once (Google OAuth; no API key).
- `claude` (Anthropic Claude Code CLI) — install from https://claude.ai/code, then run `claude` once to authenticate.

cennad never installs or logs in for you. When auth is missing the failure response carries `error.code: 'auth'` and the skill instructs you to run the appropriate login command.

---

## How to Use

### Initial Settings

```
/setup
```

Opens a local web UI to configure provider ratio (target % per provider, plus a per-provider enable toggle), intervention strength (`-2` … `+2`), keyword routing hints, per-tier model mapping (antigravity model, claude model + effort), and default options per provider. The UI runs on `127.0.0.1` with a one-time token and auto-shuts down after 5 minutes idle.

### Delegating to Codex

```
/codex -- "Refactor the OTP flow in src/auth into a state machine"
/codex --tier high -- "Long-running sandboxed refactor task"
/codex --continue <session_id> -- "Now produce the diff for module B"
```

Use codex for heavy code generation, refactoring, sandboxed shell work, or a second opinion from a different model family.

### Delegating to Antigravity

```
/antigravity -- "Summarize the latest Next.js 15 release notes"
/antigravity --tier high -- "Compare these three RFC drafts"
/antigravity --continue <session_id> -- "Extend that analysis to ..."
```

Use antigravity (`agy`) for live web-grounded research, very-large-context synthesis, YouTube/URL ingestion, or knowledge past Claude's cutoff. Access to multiple model families (Gemini, Claude, GPT-OSS) selectable per tier in `/setup`.

### Delegating to Claude (Anthropic)

```
/claude -- "Review this RFC and identify risks"
/claude --tier high -- "Analyse the tradeoffs between approach A and B"
/claude --continue <session_id> -- "Now summarise the agreed action items"
```

Use claude for reasoning-heavy analysis, writing, and review tasks where you want a fresh Anthropic model invocation isolated from the parent session's conversation and customizations. The child `claude` process runs with `--strict-mcp-config --safe-mode`, so it never inherits the parent session's MCP servers, hooks, CLAUDE.md, or skills. It can still use Claude Code's built-in tools in the spawned working directory according to `permission_mode` (default: `dontAsk`), configured in `/setup`.

### Automatic Refinement

After any single-provider delegation (`/codex`, `/antigravity`, `/claude`), the host evaluates the response against your request and, when it can name a concrete gap, continues the SAME session to close it — up to 3 provider calls total (the initial dispatch + 2 follow-ups). If the provider needs a decision only you can make (an unstated constraint, scope, or intent), the host surfaces its question instead of guessing. Pass `--no-refine` to skip this and take the first response as-is.

### Cross-checking Across Providers

```
/crosscheck -- "Is approach A or B safer for this migration?"
/crosscheck --tier high -- "Review this RFC from code, research, and reasoning angles"
```

Use crosscheck when independent second opinions across model families matter (architectural decisions, spec/PR reviews). The same prompt is forwarded in parallel to every enabled provider (codex, antigravity, claude); disabled ones are skipped. With two or more enabled, the answers are synthesized into Agreed / Conflicting / Final direction / Action checklist sections; with only one enabled, you get that provider's answer as-is. When the answers disagree in a way that changes the recommendation, crosscheck runs one convergence round — each side is shown the others and the result is re-synthesized; pass `--no-converge` to skip it. crosscheck takes no user `--continue`; to drive one side further yourself, use `/codex --continue`, `/antigravity --continue`, or `/claude --continue`.

---

## Architecture

```
Claude Code session
   │
   ├── Skills (/setup, /codex, /antigravity, /claude, /crosscheck)   Layer 3 (user)
   │       │
   │       ▼
   ├── MCP "tools" server                       Layer 2 (logic) — 3 MCP tools
   │       │
   │       ▼
   ├── Dispatcher (codex / antigravity / claude)  spawn external CLI + parse output
   │       │
   │       ▼
   ├── Core storage                             ~/.claude/plugins/cennad/...
   │
   └── Hooks (SessionStart, UserPromptSubmit)   Layer 1 (auto) — read-only context injection
```

Single-layer dispatch — no agents between skills and the MCP server. Hooks are isolated thin scripts that never import `src/core/` or `src/types/` (zod and the MCP SDK would blow the bundle budget).

### MCP Tools

| Tool                    | Purpose                                                                         |
| ----------------------- | ------------------------------------------------------------------------------- |
| `start_conversation`    | Spawn `codex`, `antigravity`, or `claude` with a prompt and return an envelope. |
| `continue_conversation` | Resume an existing session by `session_id` (project-hash-scoped).               |
| `open_settings`         | Start the local settings UI and return its URL with a one-time token.           |

### Skills

| Skill          | Trigger keywords                                          |
| -------------- | --------------------------------------------------------- |
| `/setup`       | "cennad 설정", "open cennad settings", "개입 강도"        |
| `/codex`       | "ask codex", "codex 호출", "코덱스에게"                   |
| `/antigravity` | "ask antigravity", "antigravity 호출", "안티그래비티에게" |
| `/claude`      | "ask claude", "claude 호출", "클로드에게"                 |
| `/crosscheck`  | "crosscheck", "cross check", "교차검증", "양쪽에 물어봐"  |

#### Name collision policy

`/setup`, `/codex`, `/antigravity`, `/claude`, and `/crosscheck` are registered globally without a plugin prefix. When another plugin claims the same name, Claude Code's skill-resolution order (plugin registration order) decides which one wins — the earlier registration takes priority. If you suspect a collision, list the active skills with `claude config`, or invoke the namespaced form (e.g. `cennad:setup`).

### Hooks

| Event              | Bridge bundle       | Injects                                                                      |
| ------------------ | ------------------- | ---------------------------------------------------------------------------- |
| `SessionStart`     | `injectStatic.mjs`  | Provider ratio, tone phrase, keyword map, routing guidance.                  |
| `UserPromptSubmit` | `injectDynamic.mjs` | Per-session call counter, current vs. target ratio, drift, parent-PID aware. |

Both hook bundles currently land near 3.3 KB minified and use only Node builtins — no zod, no MCP SDK, no glob libs. The build guard enforces a 10 KB LIGHT-tier cap.

---

## Disk Layout

cennad stores persistent state under `~/.claude/plugins/cennad/` by default.
Set `CENNAD_CONFIG_PATH` to point cennad at a dedicated alternate directory.
`CLAUDE_PLUGIN_DATA` and `CLAUDE_PLUGIN_DADA` are ignored for cennad storage.
If an alternate home has no readable config, cennad may read
`~/.claude/plugins/cennad/config.json` as a read-only fallback; it does not copy
or migrate that file, and saves still go to the active home.

```
~/.claude/plugins/cennad/
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

## Tiers

Each provider exposes three tier aliases. For codex, concrete reasoning-effort mappings live in the dispatcher so upstream CLI renames stay scoped to one file. Antigravity serves multiple model families, so each tier maps to a model full-name you pick in `/setup` (from the live `agy models` list), stored in config (`model_map.antigravity`). Claude maps each tier to a `{model, effort}` pair stored in config (`model_map.claude`), selectable per tier in `/setup`.

| tier   | meaning                                                                        |
| ------ | ------------------------------------------------------------------------------ |
| `high` | provider's most capable model (antigravity: the model you mapped to this tier) |
| `mid`  | balanced model                                                                 |
| `low`  | fastest / cheapest model                                                       |

codex maps tiers to reasoning effort (no env vars). Antigravity tiers are mapped in `/setup`, not via env vars. Claude tier env overrides: `CENNAD_CLAUDE_<TIER>_MODEL` / `CENNAD_CLAUDE_<TIER>_EFFORT` (e.g. `CENNAD_CLAUDE_HIGH_MODEL`, `CENNAD_CLAUDE_MID_EFFORT`).

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

For technical details and design rationale, see [`.metadata/cennad/`](../../.metadata/cennad/):

| Document                                                         | Content                                         |
| ---------------------------------------------------------------- | ----------------------------------------------- |
| [README](../../.metadata/cennad/README.md)                       | Spec index + core decisions                     |
| [spec](../../.metadata/cennad/spec.md)                           | Responsibilities, data flow, non-goals          |
| [architecture](../../.metadata/cennad/architecture.md)           | Module tree + dependency direction + build flow |
| [mcp-tools](../../.metadata/cennad/mcp-tools.md)                 | 3 MCP tools (input schema, behavior, envelope)  |
| [skills](../../.metadata/cennad/skills.md)                       | Skill body + tool-call mapping                  |
| [hooks](../../.metadata/cennad/hooks.md)                         | SessionStart / UserPromptSubmit injection       |
| [provider-dispatch](../../.metadata/cennad/provider-dispatch.md) | codex-cli / agy / claude-cli invocation matrix  |
| [storage](../../.metadata/cennad/storage.md)                     | Persistent data layout and config fallback      |
| [web-ui](../../.metadata/cennad/web-ui.md)                       | Local settings UI design                        |
| [roadmap](../../.metadata/cennad/roadmap.md)                     | Phase-by-phase implementation plan              |

[Korean documentation (README-ko_kr.md)](./README-ko_kr.md) is also available.

---

## License

MIT
