# revalidate — Spec

## Requirements

- The verification ledger (`verification-ledger.md`) is authored by the
  **main orchestrator** (Step 3) and completed by the main orchestrator
  (Step 6) — subagents never write fix statuses. Steps 4–5 subagents are
  scoped to justification checking and debt clearing only.
- Every accepted fix MUST be re-measured by main via the
  category-specific MCP tool before the verdict is rendered
  (`post_count` from the returned violation set filtered by
  `ruleId == <rule_id>` and `path` prefix `<target_path>`) — EXCEPT
  acceptance-claim rows (`rule_id` matching `CLM-\d+`), whose
  `post_count` comes from direct claim re-judgment against
  `.filid/criteria.md` (`observable` evaluated, compared to `expected`;
  PASS with cited evidence → 0, otherwise 1). Measurement tools can
  never report a CLM rule, so counting would auto-resolve claim fixes.
- `status` derives from the triple
  `(pre_count, post_count, file_was_modified)` via the matrix below —
  a file-diff matching the fix patch is necessary but never sufficient.
- If any derived row is `UNRESOLVED`, any justification is
  UNCONSTITUTIONAL, or the re-measurements surface a new critical
  violation, the verdict MUST be `FAIL` — nothing overrides this.
- An all-rejected resolve (`accepted_count == 0`) skips the ledger
  entirely; the verdict derives solely from the constitutional check.
- Step 8 cleanup removes `verification-ledger.md` with the rest of the
  session directory only when the final verdict is `PASS`.

## API Contracts

### status derivation

| pre_count | post_count | file_was_modified | derived status                        |
| --------- | ---------- | ----------------- | ------------------------------------- |
| > 0       | 0          | true              | `RESOLVED`                            |
| > 0       | > 0        | true              | `UNRESOLVED`                          |
| > 0       | > 0        | false             | `UNRESOLVED`                          |
| > 0       | 0          | false             | `UNRESOLVED` (file-diff insufficient) |
| 0         | 0          | any               | `RESOLVED` (vacuous)                  |

### Inputs

`justifications.md` frontmatter MUST carry `resolve_commit_sha` (the
pre-fix HEAD captured by `resolve` Step 4); the delta is
`git diff <resolve_commit_sha>..HEAD`. `fix-requests.md` supplies
`Path` / `Rule` / severity per fix; `review-report.md` supplies
pre-fix finding counts.
