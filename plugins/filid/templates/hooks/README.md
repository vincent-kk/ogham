# filid Hooks Reference

filid registers Claude Code hooks that enforce FCA-AI architecture rules automatically at runtime.
Hooks operate at Layer 1 of the 4-layer architecture and fire without user interaction.

## Hook Overview

| Hook Event                     | Entry File                    | Purpose                                                                                                                                             |
| ------------------------------ | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SessionStart`                 | `setup.entry.ts`              | Session initialization: FCA project detection, session cache setup, and epoch reset on `compact`/`clear` (re-arms rule delivery after context loss) |
| `PreToolUse` (Read/Write/Edit) | `pre-tool-use.entry.ts`       | Unified hook: intent injection + INTENT.md(50-line cap) / DETAIL.md(append-only) validation + organ structure protection                            |
| `PreToolUse` (EnterPlanMode)   | `plan-gate.entry.ts`          | FCA-AI compliance checklist when entering plan mode (example only — not registered in `hooks.json`)                                                 |
| `SubagentStart`                | `agent-enforcer.entry.ts`     | FCA-AI agent role restriction injection                                                                                                             |
| `UserPromptSubmit`             | `user-prompt-submit.entry.ts` | FCA-AI rules injection on session start                                                                                                             |

Built entry files live in `bridge/` after `yarn build:plugin`.

---

## Hook Details

### 1. PreToolUse — Unified Pre-Tool-Use Hook

**Entry**: `src/hooks/pre-tool-use/pre-tool-use.entry.ts`
**Built output**: `bridge/pre-tool-use.mjs`

A single consolidated hook that orchestrates three sub-hooks for every `Read`, `Write`, or `Edit` tool call:

1. **Intent Injector** (`processVisit`) — Runs on all events (Read/Write/Edit) as a delivery-state machine. A module's owner INTENT.md is "delivered" once its body has entered the live context; the state is session-scoped with a turn TTL (`injection.ctxTtlTurns`, default 5).
   - **Undelivered + Read** → injects `[filid:ctx]` (inline INTENT body + parent chain + DETAIL hint)
   - **Undelivered + Write/Edit** → denies once with the rules inline in the reason (`[filid:gate]`); the identical retry passes — rules always arrive before the first mutation
   - **Stale (TTL elapsed) + any tool** → soft `[filid:ctx]` re-delivery, never a deny
   - **Fresh** → silent. `[filid:map]` is emitted only when the turn's visit set actually changes
   - Exemptions: INTENT.md/DETAIL.md/criteria.md targets, modules with no owner INTENT.md, spike branches. Authoring a module's INTENT.md marks it delivered.

2. **Pre-Tool Validator** (`validatePreToolUse`) — Runs on Write/Edit only.
   - Blocks `Write` to `INTENT.md` if content exceeds 50 lines
   - Warns on missing 3-tier boundary sections (`## Always do`, `## Ask first`, `## Never do`)
   - Warns on `Edit` to `INTENT.md` when `new_string` exceeds 20 lines
   - Blocks `Write` to `DETAIL.md` if content is append-only growth

3. **Structure Guard** (`guardStructure`) — Runs on Write/Edit only.
   - Blocks `Write` of `INTENT.md` inside organ directories
   - Warns when creating files in subdirectories of organ directories
   - Warns on `import` statements referencing ancestor module paths (circular dependency detection)

**Result merging**: Results from all sub-hooks are merged via `mergeResults()`. The `continue` flags are ANDed (any block = overall block). When blocked, the blocking hook's output is returned. When all pass, `additionalContext` from all hooks is concatenated.

---

### 2. SubagentStart — Agent Role Enforcer

**Entry**: `src/hooks/agent-enforcer/agent-enforcer.entry.ts`
**Built output**: `bridge/agent-enforcer.mjs`

Fires when any subagent starts. Injects role-based tool restrictions into the agent's context via `additionalContext`.
Does not block agent startup; restrictions are communicated as instructions.

**Supported FCA-AI agent roles and their restrictions**:

| Agent Type          | Restriction                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------- |
| `fractal-architect` | Read-only. Cannot use Write or Edit tools. Analysis and planning only.                       |
| `qa-reviewer`       | Read-only. Cannot use Write or Edit tools. Review and report only.                           |
| `implementer`       | Must implement within the scope defined by DETAIL.md only. No architectural changes.         |
| `context-manager`   | Can only edit INTENT.md and DETAIL.md. Cannot modify business logic or source code.          |
| `drift-analyzer`    | Read-only. Cannot use Write or Edit tools. Detects drift and produces correction plans only. |
| `restructurer`      | Can only execute actions from an approved restructuring plan. No structural decisions.       |
| `code-surgeon`      | Can only apply approved fix items from fix-requests.md. No architectural changes.            |

Unrecognized agent types pass through with no restriction.

---

### 3. PreToolUse (EnterPlanMode) — Plan Gate

**Entry**: `src/hooks/plan-gate/plan-gate.entry.ts` (example only — not currently registered in `hooks/hooks.json`)
**Built output**: `bridge/plan-gate.mjs` (when enabled)

Fires when `EnterPlanMode` tool is called. Injects an FCA-AI compliance checklist reminder into the agent's context when entering plan mode.

**Behavior**:

- Passes with `additionalContext` containing FCA-AI plan compliance reminders (INTENT.md limits, organ boundaries, 3+12 test rule)
- Never blocks plan mode exit (always `continue: true`)

---

### 4. UserPromptSubmit — FCA-AI Context Injector

**Entry**: `src/hooks/user-prompt-submit/user-prompt-submit.entry.ts`
**Built output**: `bridge/user-prompt-submit.mjs`

Fires on each user prompt submission. Resets the per-turn visit map (including subagent-scoped maps), increments the session turn counter (the delivery-TTL clock), and injects FCA-AI rules into Claude's context on the first prompt of each session.

**Session gate**: Uses a session marker file in the cache directory (`~/.filid/cache/`) to ensure injection happens only once per session. Subsequent prompts in the same session return immediately.

**Project detection**: Fires only when the working directory contains `.filid/` or `INTENT.md`. Returns `continue: true` silently for non-FCA-AI projects.

**Cache**: Content hash-based invalidation. If the generated context matches the cached version, the cached copy is returned immediately (no regeneration cost).

**Injected content**:

1. Active FCA-AI project path
2. Core FCA-AI rules summary:
   - INTENT.md max 50 lines (hard cap) with 3-tier boundary sections
   - DETAIL.md has no line cap; updates must restructure in place
     (append-only growth forbidden, required sections preserved)
   - Organ directories must not have INTENT.md
   - Spec files max 15 cases (3 basic + 12 complex); test.ts exempt
   - LCOM4 >= 2 triggers module split; CC > 15 triggers compress/abstract
3. All 7 built-in fractal structure rules (from `rule-engine.ts`)
4. FractalNode category classification guide

Never blocks user prompts (always `continue: true`).

---

### 5. Session Cleanup — MCP Server Lifecycle

filid no longer registers a `SessionEnd` hook. `SessionEnd` is Claude-only, so
session-scoped cleanup moved to the **MCP server process lifecycle** — the server
is spawned and killed once per session, making its termination the only session-end
signal common to all three hosts (Claude, Codex, Antigravity).

**Entry**: `src/mcp/server/` (`registerShutdown` + `bootSweep`)

**Behavior**:

- **Shutdown** (`exit`/`SIGINT`/`SIGTERM`) — synchronously deletes this session's own
  cache/marker files (`session-context-<hash>` and its siblings), keyed by the
  `CLAUDE_CODE_SESSION_ID` env var. No-op when the var is absent.
- **Boot sweep** — on the next server start, prunes stale session files and cache
  directories past their TTL (daily-throttled, idempotent). This is the fallback
  that finalizes any session whose shutdown was cut off.
- Best-effort + TTL-backed, not a guaranteed per-session hook. Only ever removes
  filid's own cache files, never project files.

---

## Hook Registration

Hooks are registered via `hooks/hooks.json` in the package root.
Each hook command runs through `libs/run.cjs` (cross-platform Node runner
using `process.execPath`), which executes the built `.mjs` file in `bridge/`.

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/libs/run.cjs\" \"${CLAUDE_PLUGIN_ROOT}/bridge/setup.mjs\"",
            "timeout": 30
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Read|Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/libs/run.cjs\" \"${CLAUDE_PLUGIN_ROOT}/bridge/pre-tool-use.mjs\"",
            "timeout": 10
          }
        ]
      }
    ],
    "SubagentStart": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/libs/run.cjs\" \"${CLAUDE_PLUGIN_ROOT}/bridge/agent-enforcer.mjs\"",
            "timeout": 3
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/libs/run.cjs\" \"${CLAUDE_PLUGIN_ROOT}/bridge/user-prompt-submit.mjs\"",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

After any hook source change, rebuild with `yarn build:plugin` to regenerate `bridge/`.
