---
name: setup
user_invocable: true
disable-model-invocation: true
description: '[seiri:setup] Choose which seiri code-authoring rules this repository uses. Opens a local settings page showing a diff of what saving would change. Trigger: "seiri setup", "seiri 설정"'
argument-hint: '[path]'
version: '0.1.0'
complexity: simple
plugin: seiri
---

# setup — choose this repository's rules

Deploys the rules you select to `.claude/rules/seiri_*.md`, where the
harness loads them at the start of every session. Nothing is written
before you confirm, and the page shows the exact change first.

## Workflow

**Phase 1 — settings page.** Call
`mcp__plugin_seiri_tools__open_settings({ path: "<absolute-path>", waitSeconds: 300 })`.
It opens the browser form and blocks until the user acts. Dispatch on
`result.status` and continue in the same response:

- `saved` — report the outcome list from `result.summary.ruleDocs` in one
  or two lines. Name any entry whose action is `drift` or `skip`; those
  are the ones that did not land.
- `pending` — call once more. If still pending, surface `result.url` and
  stop.
- `closed` — nothing changed. Say so and stop.

**Phase 2 — headless fallback.** Only when Phase 1 cannot open a browser
(the call fails, or the host has no display). Then:

1. `rule_docs_sync({ action: "status", project_root })` — what is deployed now.
2. `rule_docs_sync({ action: "plan", project_root, selections })` — show
   this diff and get explicit confirmation.
3. `rule_docs_sync({ action: "sync", project_root, selections, resync })` —
   only after that confirmation.

## Rules

- Never skip the plan step. Rule files become standing instructions read
  every session; the user decides what lands before it lands.
- A rule id left out of `selections` is opted out, which **removes** its
  deployed file. Say so when a selection would delete something.
- Pass a rule id in `resync` only when the user asked for that rule's
  local edits to be discarded. Report drift; do not resolve it for them.
