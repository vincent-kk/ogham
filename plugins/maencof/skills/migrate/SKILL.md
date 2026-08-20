---
name: migrate
user-invocable: true
description: '[maencof:migrate] Vault migration dispatcher — presents the available migrations (architecture v3 upgrade, publication → 99_Archive/clusterseed conversion) and runs only the selected one. Unselected option instructions are never loaded into context.'
argument-hint: '[architecture|publications] [--dry-run] [--rollback]'
version: '3.0.0'
complexity: medium
context_layers: []
orchestrator: migrate skill
plugin: maencof
---

# migrate — Vault Migration Dispatcher

This skill is a thin router. Each migration's full procedure lives in its own
reference file and is loaded ONLY after that option is selected — never load
more than one option file in a session.

## Options

| Option         | Reference (load on selection only)  | What it does                                                               |
| -------------- | ----------------------------------- | -------------------------------------------------------------------------- |
| `architecture` | `references/architecture-v3.md`     | Upgrade vault directory architecture to v3 (L3 sub-layers, flat L5, hubs)  |
| `publications` | `references/publication-archive.md` | Convert scattered publications to 99_Archive storage + clusterseed anchors |

## Routing

1. If `$ARGUMENTS` names an option (`architecture` or `publications`), select
   it directly and pass the remaining flags through.
2. Otherwise — including legacy flag-only calls like `--dry-run` or
   `--rollback` — ask with `AskUserQuestion`: "Which migration do you want to
   run?" — one option per row above, plus their one-line descriptions. Carry
   the given flags into the selected option (a bare `--rollback` becomes
   "which migration's rollback?"). Never default silently: both options
   accept the same flags, so a guessed default could roll back the wrong
   migration.
3. Read ONLY the selected option's reference file, then follow it exactly.
   Do not read, summarize, or quote the other option's file.
4. If the user asks what the options do or how they compare, answer from the
   table above alone — do not open either reference file to compose the
   answer.

## Shared constraints (inherited by every option)

- Migration assumes exclusive vault access — do not run other maencof tools
  concurrently (`kg_build`, `create`, `update`, …).
- Migration is always explicit — never auto-triggered.
- Every option is WAL-based and reversible; each reference documents its own
  rollback.
- Bundled scripts are executed via Bash, never loaded into context. Resolve
  them through `${CLAUDE_PLUGIN_ROOT}/skills/migrate/...`; when unset, locate
  with `Glob(**/skills/migrate/scripts/<name>.mjs)`.
