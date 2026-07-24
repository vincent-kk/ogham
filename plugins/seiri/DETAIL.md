# DETAIL — seiri

## Requirements

### Rule deployment

- Rule documents ship in `templates/rules/` and are deployed to
  `<repoRoot>/.claude/rules/<filename>` only through a setup surface: the
  settings page, or `rule_docs_sync`. Session hooks never write there.
- Deployment state is read from the filesystem. It is never mirrored into
  configuration, because a mirrored copy can only drift from the files it
  claims to describe.
- Every rule is opt-in. There is no required rule and no auto-deploy.
- A deployed file whose bytes differ from the shipped template is drift.
  Drift is reported and preserved unless the caller names that rule id in
  `resync`. An unreadable deployed file counts as drift, not as a match.
- A rule id absent from a selection is opted out, which removes its file.
- Partial failure records the failing entry as `skip` with a reason and
  continues. Silent failure is prohibited.

### Preview

- `plan` answers what `sync` would do, writing nothing. Both route
  through `decideRuleDocAction`, so a preview cannot describe an outcome
  the write would not produce.

### Session reporting

- SessionStart injects active rule names, the dial position, and drift
  warnings — never rule content, which the harness already loads.
- A project with no deployed rule receives no injection.
- Any failure yields `{ continue: true }` with no injection. A hook must
  not be able to block a session.
- PostToolUse and PostToolUseFailure watch Bash outcomes only. The dial
  gates the hook before any state is written, so at `advisory` nothing is
  recorded. A failure chain is announced at most once per session per
  command hash, and an interrupted call (`is_interrupt`) is not counted
  as a failure.
- SubagentStart re-injects the same posture in compact form, capped at
  two lines, and injects nothing at all at `advisory`.
- InstructionsLoaded is implemented but not registered in `hooks.json`
  (dormant). While dormant it never runs; if registered it persists the
  whole hook payload and injects nothing.

### Configuration

- The intervention dial is stored in two layers under `<repoRoot>/.seiri/`
  and nothing else is stored there: `config.json` is the committed
  baseline, written only by a setup surface; `runtime.json` is an
  untracked session valve, written only by the `config` action.
- The dial in effect is `runtime ?? baseline ?? advisory`. Hooks resolve
  it per run, so a change applies without restarting a session.
- A runtime value that differs from the baseline is always named as such
  wherever the dial is rendered. Silent override is prohibited.
- Reading never throws. A damaged layer is skipped, the next layer
  applies, and the ignored file is named in a warning.
- The first `runtime.json` write also creates `.seiri/.gitignore` listing
  the directory's untracked members. An existing one is left as found;
  the repository's root ignore file is never edited.

## API Contracts

| Export                                     | Contract                                                                                             |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `loadConfig(projectRoot)`                  | Baseline layer only: `{ config \| null, path, warning? }`. Never throws.                             |
| `loadIntervention(projectRoot)`            | Both layers: `{ effective, source, baseline, runtime, warnings }`. Never throws.                     |
| `writeConfig(projectRoot, config)`         | Writes the baseline atomically; returns the path written.                                            |
| `writeRuntime(projectRoot, level)`         | Writes the valve atomically plus `.seiri/.gitignore`; returns the path.                              |
| `clearRuntime(projectRoot)`                | Drops the valve; returns whether one existed.                                                        |
| `loadManifest(pluginRoot)`                 | Throws on a malformed manifest or a missing `templateHash`.                                          |
| `getRuleDocsStatus(projectRoot, plugin)`   | Per-rule filesystem snapshot including `inSync`.                                                     |
| `planRuleDocs(...)` / `applyRuleDocs(...)` | Same decisions; `applied` distinguishes preview from write.                                          |
| `open_settings`                            | `{ status: saved \| closed \| pending, url, summary? }`. Bounded wait.                               |
| `rule_docs_sync`                           | Actions `status` · `manifest` · `plan` · `sync` · `config`.                                          |
| `rule_docs_sync` action `config`           | `{ op, changed, dial, posture }`. `set` needs a valid `intervention`; the baseline is never written. |

## Scope

Out of scope: architecture enforcement, agent orchestration, task
decomposition, knowledge management, notifications, status display,
code search or analysis tooling. seiri owns context — not the
repository's truth, and not the model's judgment.
