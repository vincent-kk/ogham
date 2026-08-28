# Reply-plugin discovery playbook (Server/DC)

The `read`, `scan`, and `probe` modes never write the profile file. Only an explicitly confirmed `save_profile` call writes it.

## When `read` returns `hint`

1. Tell the user: standard comments were returned, but this site has no reply-plugin profile yet.
2. Ask for one issue key that is known to carry replies.
3. Call `mcp__plugin_atlassian_tools__comment_thread` (Claude/agy) or `mcp__atlassian__comment_thread` (Codex) with `mode: "probe", sample_issue_key`.
4. Show `evidence` (standard total, Comment items, property keys, truncation), `warnings`, `reason`, and `proposal` verbatim, and ask whether to save it.
5. Only after an explicit yes, call `mode: "save_profile"` with the **unchanged** `proposal` and its `proposal_digest`.
6. Re-run `read`.

If `proposal` is `null`, read `reason`. When the user states that replies are already visible as ordinary comments, show `{ "pattern": "standard", "propertyKeys": [] }` and ask whether to save it. Only after an explicit yes, call `save_profile` without a digest — this disables merging for the site.

## Where the profile lives

- Claude Code and agy: `${CLAUDE_CONFIG_DIR:-~/.claude}/plugins/atlassian/comment-profiles.json`
- Codex: `${CODEX_HOME:-~/.codex}/plugins/atlassian/comment-profiles.json`

The file survives plugin updates. It has one entry per hostname: `{ "pattern": "changelog" | "standard" | "unknown", "propertyKeys": ["replyplugin"], "verifiedAt": ISO }`. Users may edit it by hand; invalid entries are ignored with a warning.

## Degradation you must relay

Relay every `warnings[]` entry even when `complete` is `true`, in addition to the structured signals below.

| Signal in the response                 | Say to the user                                             |
| -------------------------------------- | ----------------------------------------------------------- |
| `complete: false`                      | The changelog was truncated; some replies may be missing    |
| `complete: "unknown"`                  | The changelog could not be read; replies not recovered      |
| `deleted: true` on a reply             | The plugin marks this reply deleted                         |
| `suspectedDuplicate: true`             | Same author/body/time as a standard comment — may be a copy |
| `orphan: true`                         | Reply points at an unknown comment id                       |
| warning containing `profile … ignored` | The profile file entry is invalid; re-run probe or fix it   |

## Scan mode

`mode: "scan", jql` lists issues whose changelog carries `Comment` items. It only detects the changelog pattern — zero results on a site whose plugin stores replies as ordinary comments is expected.

If scan returns `complete: false`, say that the issue cap or paging boundary stopped the scan and the result set is incomplete. Relay every scan warning as well.
