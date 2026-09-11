# comment

| Operation      | Method | Endpoint                    | Notes                                                                                       |
| -------------- | ------ | --------------------------- | ------------------------------------------------------------------------------------------- |
| List comments  | GET    | `/issue/{key}/comment`      | Cloud. On Server/DC use `comment_thread` (below)                                            |
| Get comment    | GET    | `/issue/{key}/comment/{id}` | Both deployments; the target of `focusedCommentId` URLs                                     |
| Add comment    | POST   | `/issue/{key}/comment`      | `{ body }` with `content_format: "markdown"`; JSM visibility: [JSM comments](#jsm-comments) |
| Update comment | PUT    | `/issue/{key}/comment/{id}` | `{ body }`                                                                                  |
| Delete comment | DELETE | `/issue/{key}/comment/{id}` |                                                                                             |

## comment_thread (Server/DC)

`mcp__plugin_atlassian_tools__comment_thread` (Codex: `mcp__atlassian__comment_thread`) lists comments and merges replies stored by third-party reply plugins when the site has a saved profile. Cloud sites are rejected — use `fetch` there. For JSM customer-visible comments, see [JSM comments](#jsm-comments).

| Parameter                    | Mode         | Notes                                                                    |
| ---------------------------- | ------------ | ------------------------------------------------------------------------ |
| `mode`                       | all          | `read` (default) · `scan` · `probe` · `save_profile`                     |
| `base_url`                   | all          | Site selector when several Jira sites are configured                     |
| `issue_key`                  | read         | Required                                                                 |
| `start_at`, `max_results`    | read         | Present → one page (≤100); absent → all pages (cap 1000, with a warning) |
| `expand`                     | read         | Passed to the comment list (e.g. `renderedBody`)                         |
| `jql`, `max_issues`          | scan         | Issues whose changelog carries `Comment` items (default 100, cap 500)    |
| `sample_issue_key`           | probe        | An issue that has at least one standard comment                          |
| `profile`, `proposal_digest` | save_profile | Exactly the probe's proposal; digest required for `pattern: "changelog"` |

Fields belonging to another mode are validation errors, not ignored.

`read` returns `{ issue, thread[], warnings[], complete, profile, hint? }`; replies hang under their root comment as `thread[].replies[]`. `complete: false` — changelog truncated, replies may be missing; `"unknown"` — changelog unavailable. `hint` is present only when the site has no profile: run the check below once, then continue in `reply-plugin.md`.

## Thread clues (Server/DC, `read` returned `hint`)

Without a profile only standard comments came back; if the site runs a reply plugin its replies are missing. Decide once per issue from what is already in context — the check sends no request:

| Clue                                                                                                         | Where to look                             |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| The request concerns replies, threads, who answered whom, or the whole conversation (summary, digest)        | the user's message                        |
| A comment reads as an answer to text absent from `thread[]` (quotes an unseen message, "Re:", "reply above") | `thread[].body`                           |
| A changelog already fetched for this issue has an item with `field: "Comment"`                               | a prior `fetch … expand=changelog` result |
| The user names a reply plugin or says replies are missing                                                    | the user's message                        |

- Any clue and `thread.length > 0` → `mode: "probe", sample_issue_key: <the issue just read>` (read-only), then `reply-plugin.md` step 4.
- No clue → one sentence in the answer: the site has no reply-plugin profile, so plugin replies (if any) are not included; offer the probe. Do not probe.
- At most once per issue per conversation. A non-null `profile` in any later `read` ends it for the site.

## JSM comments

Customer-visible vs internal is a Service Desk concept, not comment `visibility`. Use the Service Desk API on both deployments:

`POST /rest/servicedeskapi/request/{issueIdOrKey}/comment` with `{ body: "<plain text>", public: true | false }`.

`body` is a plain string here — do not set `content_format: "markdown"` (on Cloud it would turn `body` into ADF, which this API rejects).
