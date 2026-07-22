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
- InstructionsLoaded persists the whole hook payload and injects nothing.

### Configuration

- `<repoRoot>/.seiri/config.json` holds the intervention dial and nothing
  else. Reading it never throws; a damaged file yields defaults plus a
  warning the session render surfaces.

## API Contracts

| Export                                     | Contract                                                               |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| `loadConfig(projectRoot)`                  | `{ config \| null, path, warning? }`. Never throws.                    |
| `writeConfig(projectRoot, config)`         | Writes atomically; returns the path written.                           |
| `loadManifest(pluginRoot)`                 | Throws on a malformed manifest or a missing `templateHash`.            |
| `getRuleDocsStatus(projectRoot, plugin)`   | Per-rule filesystem snapshot including `inSync`.                       |
| `planRuleDocs(...)` / `applyRuleDocs(...)` | Same decisions; `applied` distinguishes preview from write.            |
| `open_settings`                            | `{ status: saved \| closed \| pending, url, summary? }`. Bounded wait. |
| `rule_docs_sync`                           | Actions `status` · `manifest` · `plan` · `sync`.                       |

## Scope

Out of scope: architecture enforcement, agent orchestration, task
decomposition, knowledge management, notifications, status display,
code search or analysis tooling. seiri owns context — not the
repository's truth, and not the model's judgment.
