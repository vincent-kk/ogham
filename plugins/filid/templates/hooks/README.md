# Filid Hooks Reference

Filid registers three Claude Code lifecycle hooks. They deliver FCA context and protect INTENT.md/DETAIL.md contracts without assigning agent roles or changing behavior by Git branch.

## Hook Overview

| Hook Event                     | Source Entry                                           | Built Bundle                    |
| ------------------------------ | ------------------------------------------------------ | ------------------------------- |
| `SessionStart`                 | `src/hooks/setup/setup.entry.ts`                       | `bridge/setup.mjs`              |
| `UserPromptSubmit`             | `src/hooks/userPromptSubmit/userPromptSubmit.entry.ts` | `bridge/user-prompt-submit.mjs` |
| `PreToolUse` (Read/Write/Edit) | `src/hooks/preToolUse/preToolUse.entry.ts`             | `bridge/pre-tool-use.mjs`       |

The hook build also emits shared host runners:

- `bridge/run-agy.mjs` translates agy payloads to and from the Claude hook contract.
- `bridge/run-hook.cmd` starts `libs/run.cjs` reliably on Windows.
- `libs/run.cjs` starts each Claude hook with the current Node executable.

## Hook Contracts

### SessionStart

`setup` detects whether the current project uses FCA, initializes session state, and re-arms context delivery after a startup, resume, clear, or compaction. Non-FCA projects pass through without mutation.

### UserPromptSubmit

`userPromptSubmit` resets the per-turn visit map, advances the context-delivery turn counter, and supplies the session's FCA pointer when required. Its behavior does not depend on the current branch and it never emits a spike-mode banner.

### PreToolUse

`preToolUse` orchestrates three concerns for `Read`, `Write`, and `Edit`:

1. Intent delivery points to the nearest INTENT.md (cwd-relative path plus a read directive), the parent chain, the DETAIL.md hint, and the changed visit map before work proceeds in a module. Document bodies are never inlined; the agent reads them.
2. Document validation keeps INTENT.md at 50 lines or fewer, requires `### Always do`, `### Ask first`, and `### Never do`, and rejects append-only DETAIL.md growth.
3. Structure guarding reports organ placement and dependency-boundary risks.

The INTENT.md and DETAIL.md write gates are branch-independent. Spike branches, reflogs, harvest manifests, and `.filid/criteria.md` do not bypass them. A legacy `.filid/criteria.md` ledger is reported by `fractal_inspect` action `validate`; hooks do not deny a tool call merely because that ledger exists.

## Registration

`hooks/hooks.json` is the canonical Claude hook manifest:

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
    ]
  }
}
```

Root host manifests and `bridge/*` are generated artifacts. Change the canonical manifest or TypeScript entry sources, then run:

```bash
yarn filid build:hooks
```

The official hook build emits the three lifecycle bundles and shared runners, and removes the retired `bridge/agent-enforcer.mjs` bundle.
