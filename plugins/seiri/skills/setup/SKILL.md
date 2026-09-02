---
name: setup
user-invocable: true
disable-model-invocation: true
description: 'Choose which seiri code-authoring rules this repository uses; a local settings page shows the diff before anything is written.'
argument-hint: '[path]'
version: '0.1.0'
complexity: simple
plugin: seiri
---

# setup — choose this repository's rules

Deploys the rules you select to the active host's project rule channel, which the harness loads every session. Nothing is written before you confirm.

## Workflow

**Phase 1 — settings page.** Call `mcp__plugin_seiri_tools__open_settings({ path: "<absolute-path>", waitSeconds: 300 })`. It blocks until the user acts. Dispatch on `result.status`, same response:

- `saved` — report `result.summary.ruleDocs` in a line or two. Name every `drift` or `skip` entry; those did not land.
- `pending` — call once more. If still pending, surface `result.url` and stop.
- `closed` — nothing changed. Say so and stop.

**Phase 2 — headless fallback.** Only when Phase 1 cannot open a browser. Then:

1. `rule_docs_sync({ action: "status", project_root })` — what is deployed now.
2. `rule_docs_sync({ action: "plan", project_root, selections })` — show `result` and get explicit confirmation; retain `result.revision`.
3. `rule_docs_sync({ action: "sync", project_root, selections, resync, revision })` — only after that confirmation, passing the revision from step 2.

## Rules

- Never skip the plan step or omit its revision from sync. Rule files become standing instructions read every session; the user decides what lands before it lands.
- A rule id left out of `selections` is opted out, which **removes** its deployed file. Say so when a selection would delete something.
- Pass a rule id in `resync` only when the user asked for that rule's edits to be discarded. Report drift; do not resolve it for them.
- Offering gate scaffolds follows the dial (`rule_docs_sync({ action: "config" })`): silent at off and advisory, offered once at standard, urged at strict.
