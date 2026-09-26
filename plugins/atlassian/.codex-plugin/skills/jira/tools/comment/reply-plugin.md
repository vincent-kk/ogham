# Reply-plugin discovery (Server/DC)

`read`, `scan`, and `probe` never write the profile; only a confirmed `save_profile` does.

## After `read` returned `hint`

1. Run "Thread clues" in `schema.md` once. No clue → say plugin replies (if any) are not included, offer the probe, stop.
2. `sample_issue_key` = the issue just read (it has standard comments). Ask for another key only when the probe returns `proposal: null` and the user believes replies exist.
3. `mode: "probe", sample_issue_key` — read-only.
4. Show `evidence`, `warnings`, `reason`, and `proposal` verbatim; ask whether to save.
5. Explicit yes → `mode: "save_profile"` with the **unchanged** `proposal` and its `proposal_digest`.
6. Re-run `read`.

`proposal: null` → relay `reason`. If the user says replies already appear as ordinary comments, offer `{ "pattern": "standard", "propertyKeys": [] }`; on explicit yes call `save_profile` without a digest — this disables merging for the site.

## Profile file

`${CLAUDE_CONFIG_DIR:-~/.claude}/plugins/atlassian/comment-profiles.json` (Codex: `${CODEX_HOME:-~/.codex}/…`). Envelope `{ "schemaVersion": 1, "sites": { "<hostname>": { "pattern": "changelog" | "standard" | "unknown", "propertyKeys": [...], "verifiedAt": ISO } } }`. Survives plugin updates; hand-editable; an invalid site entry is skipped with a warning. A site whose `pattern` is `"unknown"` returns warnings but no `hint` — offer the probe again in that case.

## Signals to relay

Relay every `warnings[]` entry even when `complete` is `true`.

| Signal                                 | Meaning                                                     |
| -------------------------------------- | ----------------------------------------------------------- |
| `complete: false`                      | Changelog truncated; some replies may be missing            |
| `complete: "unknown"`                  | Changelog unreadable; replies not recovered                 |
| `deleted: true` on a reply             | The plugin marks this reply deleted                         |
| `suspectedDuplicate: true`             | Same author/body/time as a standard comment — may be a copy |
| `orphan: true`                         | Reply points at an unknown comment id                       |
| warning containing `profile … ignored` | Invalid profile entry; re-run probe or fix the file         |

## Scan

`mode: "scan", jql` lists issues whose changelog carries `Comment` items — it detects only the changelog pattern, so zero results on a site whose plugin stores replies as ordinary comments is expected. `complete: false` means the issue cap, a paging boundary, or missing changelog data on some results stopped the scan short.
