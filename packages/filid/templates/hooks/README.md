# filid Hooks Reference

filid registers Claude Code hooks that enforce FCA-AI architecture rules automatically at runtime.
Hooks operate at Layer 1 of the 4-layer architecture and fire without user interaction.

## Hook Overview

| Hook Event | Entry File | Purpose |
|---|---|---|
| `PreToolUse` (Read/Write/Edit) | `pre-tool-use.entry.ts` | Unified hook: intent injection + INTENT.md/DETAIL.md validation + organ structure protection |
| `PreToolUse` (EnterPlanMode) | `plan-gate.entry.ts` | FCA-AI compliance checklist when entering plan mode |
| `SubagentStart` | `agent-enforcer.entry.ts` | FCA-AI agent role restriction injection |
| `UserPromptSubmit` | `context-injector.entry.ts` | FCA-AI rules injection on session start |
| `SessionEnd` | `session-cleanup.entry.ts` | Session cache and marker file cleanup |

Built entry files live in `bridge/` after `yarn build:plugin`.

---

## Hook Details

### 1. PreToolUse — Unified Pre-Tool-Use Hook

**Entry**: `src/hooks/entries/pre-tool-use.entry.ts`
**Built output**: `bridge/pre-tool-use.mjs`

A single consolidated hook that orchestrates three sub-hooks for every `Read`, `Write`, or `Edit` tool call:

1. **Intent Injector** (`injectIntent`) — Runs on all events (Read/Write/Edit). Injects fractal context (`[filid:ctx]` block) on first visit to a directory, and fractal map (`[filid:map]`) on subsequent visits.

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

**Entry**: `src/hooks/entries/agent-enforcer.entry.ts`
**Built output**: `bridge/agent-enforcer.mjs`

Fires when any subagent starts. Injects role-based tool restrictions into the agent's context via `additionalContext`.
Does not block agent startup; restrictions are communicated as instructions.

**Supported FCA-AI agent roles and their restrictions**:

| Agent Type | Restriction |
|---|---|
| `fractal-architect` | Read-only. Cannot use Write or Edit tools. Analysis and planning only. |
| `qa-reviewer` | Read-only. Cannot use Write or Edit tools. Review and report only. |
| `implementer` | Must implement within the scope defined by DETAIL.md only. No architectural changes. |
| `context-manager` | Can only edit INTENT.md and DETAIL.md. Cannot modify business logic or source code. |
| `drift-analyzer` | Read-only. Cannot use Write or Edit tools. Detects drift and produces correction plans only. |
| `restructurer` | Can only execute actions from an approved restructuring plan. No structural decisions. |
| `code-surgeon` | Can only apply approved fix items from fix-requests.md. No architectural changes. |

Unrecognized agent types pass through with no restriction.

---

### 3. PreToolUse (EnterPlanMode) — Plan Gate

**Entry**: `src/hooks/entries/plan-gate.entry.ts`
**Built output**: `bridge/plan-gate.mjs`

Fires when `EnterPlanMode` tool is called. Injects an FCA-AI compliance checklist reminder into the agent's context when entering plan mode.

**Behavior**:
- Passes with `additionalContext` containing FCA-AI plan compliance reminders (INTENT.md limits, organ boundaries, 3+12 test rule)
- Never blocks plan mode exit (always `continue: true`)

---

### 4. UserPromptSubmit — FCA-AI Context Injector

**Entry**: `src/hooks/entries/context-injector.entry.ts`
**Built output**: `bridge/context-injector.mjs`

Fires on each user prompt submission. Injects FCA-AI rules into Claude's context on the first prompt of each session.

**Session gate**: Uses a session marker file in the cache directory (`~/.filid/cache/`) to ensure injection happens only once per session. Subsequent prompts in the same session return immediately.

**Project detection**: Fires only when the working directory contains `.filid/` or `INTENT.md`. Returns `continue: true` silently for non-FCA-AI projects.

**Cache**: Content hash-based invalidation. If the generated context matches the cached version, the cached copy is returned immediately (no regeneration cost).

**Injected content**:
1. Active FCA-AI project path
2. Core FCA-AI rules summary:
   - INTENT.md max 50 lines with 3-tier boundary sections
   - DETAIL.md no append-only growth
   - Organ directories must not have INTENT.md
   - Test files max 15 cases per spec (3 basic + 12 complex)
   - LCOM4 >= 2 triggers module split; CC > 15 triggers compress/abstract
3. All 7 built-in fractal structure rules (from `rule-engine.ts`)
4. FractalNode category classification guide

Never blocks user prompts (always `continue: true`).

---

### 5. SessionEnd — Session Cleanup

**Entry**: `src/hooks/entries/session-cleanup.entry.ts`
**Built output**: `bridge/session-cleanup.mjs`

Fires when a Claude Code session ends. Cleans up session-specific cache and marker files.

**Behavior**:
- Deletes the session context marker file (`session-context-<hash>`) from the plugin cache directory
- Deletes the cached context file (`cached-context-<hash>`) if present
- Always returns `continue: true` (SessionEnd hooks cannot block session termination)
- Safe: only removes filid's own cache files, never touches project files

---

## Hook Registration

Hooks are registered via `hooks/hooks.json` in the package root.
Each hook command uses `find-node.sh` to locate the Node.js binary (nvm/fnm support),
then executes the built `.mjs` file in `bridge/`.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Read|Write|Edit",
        "hooks": [
          { "type": "command", "command": "[ -z \"${CLAUDE_PLUGIN_ROOT}\" ] && exit 0; \"${CLAUDE_PLUGIN_ROOT}/libs/find-node.sh\" \"${CLAUDE_PLUGIN_ROOT}/bridge/pre-tool-use.mjs\"", "timeout": 3 }
        ]
      },
      {
        "matcher": "EnterPlanMode",
        "hooks": [
          { "type": "command", "command": "[ -z \"${CLAUDE_PLUGIN_ROOT}\" ] && exit 0; \"${CLAUDE_PLUGIN_ROOT}/libs/find-node.sh\" \"${CLAUDE_PLUGIN_ROOT}/bridge/plan-gate.mjs\"", "timeout": 3 }
        ]
      }
    ],
    "PostToolUse": [],
    "SubagentStart": [
      {
        "matcher": "*",
        "hooks": [
          { "type": "command", "command": "[ -z \"${CLAUDE_PLUGIN_ROOT}\" ] && exit 0; \"${CLAUDE_PLUGIN_ROOT}/libs/find-node.sh\" \"${CLAUDE_PLUGIN_ROOT}/bridge/agent-enforcer.mjs\"", "timeout": 3 }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "matcher": "*",
        "hooks": [
          { "type": "command", "command": "[ -z \"${CLAUDE_PLUGIN_ROOT}\" ] && exit 0; \"${CLAUDE_PLUGIN_ROOT}/libs/find-node.sh\" \"${CLAUDE_PLUGIN_ROOT}/bridge/context-injector.mjs\"", "timeout": 5 }
        ]
      }
    ],
    "SessionEnd": [
      {
        "matcher": "*",
        "hooks": [
          { "type": "command", "command": "[ -z \"${CLAUDE_PLUGIN_ROOT}\" ] && exit 0; \"${CLAUDE_PLUGIN_ROOT}/libs/find-node.sh\" \"${CLAUDE_PLUGIN_ROOT}/bridge/session-cleanup.mjs\"", "timeout": 3 }
        ]
      }
    ]
  }
}
```

After any hook source change, rebuild with `yarn build:plugin` to regenerate `bridge/`.
