# re-validate — Reference Documentation

Output format templates, PR comment format, and detailed verification
reference for the Delta re-validation skill.

## verification-ledger.md Template (Step 3 subagent writer)

Every accepted fix becomes one row. The Step 3 subagent MUST emit the
literal `TBD` string in `post_count` and `status`; the main orchestrator
in Step 6 overwrites those fields with derived values (see DETAIL.md
`## API Contracts`).

```markdown
# Verification Ledger — <branch name>

**Resolve Commit**: <resolve_commit_sha>
**Written By**: filid-revalidate Step 3 subagent
**Authoritative Writer (post_count / status)**: filid-revalidate Step 6 main

| fix_id  | target_path           | rule_id            | pre_count | post_count | file_was_modified | status |
| ------- | --------------------- | ------------------ | --------- | ---------- | ----------------- | ------ |
| FIX-001 | packages/foo/index.ts | module-entry-point | 1         | TBD        | true              | TBD    |
| FIX-002 | src/legacy/big.ts     | lcom4              | 3         | TBD        | false             | TBD    |
```

## re-validate.md Format

```markdown
# Re-validation Result — <branch name>

**Date**: <ISO 8601>
**Verdict**: PASS | FAIL
**Delta Base**: <resolve_commit_sha>
**Delta Commits**: <commit count since resolve>

## Delta Analysis

| File   | Change Type            | Related Fix |
| ------ | ---------------------- | ----------- |
| <path> | added/modified/deleted | FIX-<ID>    |

## Fix Verification

| Fix ID  | Status           | Detail                               |
| ------- | ---------------- | ------------------------------------ |
| FIX-001 | RESOLVED         | <metric before → after>              |
| FIX-002 | DEFERRED         | Justification accepted, debt created |
| FIX-003 | UNRESOLVED       | <what remains unfixed>               |
| FIX-004 | UNCONSTITUTIONAL | <non-negotiable rule violated>       |

## Debt Changes

| Change   | Debt File    | Detail                |
| -------- | ------------ | --------------------- |
| CREATED  | <debt-id>.md | <from resolve-review> |
| RESOLVED | <debt-id>.md | <rule now satisfied>  |

## New Violations Check

| Check                   | Result       | Detail                |
| ----------------------- | ------------ | --------------------- |
| New critical violations | NONE / FOUND | <if found, list them> |

## Final Verdict

**<PASS|FAIL>** — <summary statement>

<If PASS>:
All fixes resolved or validly deferred. PR is ready for merge.
Clean up `.filid/review/<branch>/` after merge.

<If FAIL>:
Unresolved items remain. Address the following before re-running:

- <list unresolved items>
```

## PR Comment Format

Use `mcp_t_review_manage(action: "format-revalidate-comment")` to generate the PR comment.
The tool reads `re-validate.md`, wraps it in a collapsible `<details>` section,
and returns a ready-to-post markdown string in the `markdown` field.
Post it via `gh pr comment --body`.

The tool handles size limits (truncates if >50,000 chars) and extracts the
PASS/FAIL verdict automatically. No manual formatting is needed.

### Generated Output Structure

```markdown
## Re-validation — ✅ PASS (or ❌ FAIL)

<details><summary>Re-validation Details</summary>

{full re-validate.md content — delta analysis, fix verification results, debt changes, final verdict}

</details>

> Full report: `.filid/review/<branch>/re-validate.md`
```

The `<details>` block contains the full `re-validate.md` content (delta analysis,
fix verification table, debt changes, new violation checks, final verdict) so that
PR reviewers can expand and inspect the complete re-validation without access to
local files.

## Verification MCP Tool Map

| Fix Type            | Verification Tool                    | Pass Condition         |
| ------------------- | ------------------------------------ | ---------------------- |
| LCOM4 violation     | `mcp_t_ast_analyze(lcom4)`                 | LCOM4 < 2              |
| CC violation        | `mcp_t_ast_analyze(cyclomatic-complexity)` | CC <= 15               |
| 3+12 violation      | `mcp_t_test_metrics(check-312)`      | All files PASS         |
| Structure violation | `mcp_t_structure_validate`           | No violations          |
| Circular dependency | `mcp_t_ast_analyze(dependency-graph)`      | No cycles              |
| Drift               | `mcp_t_drift_detect`                       | No drift               |
| Document compliance | `mcp_t_doc_compress(auto)` + Read    | INTENT.md <= 50 lines  |

## Non-Negotiable Rules (Constitutional)

These rules cannot be deferred via justification. Any justification
attempting to defer these is marked UNCONSTITUTIONAL:

1. **Hardcoded secrets/credentials** — always FAIL
2. **Circular dependencies** — always FAIL
3. **Security vulnerabilities** (injection, auth bypass) — always FAIL

## Debt Resolution Criteria

A debt item is considered resolved when:

1. The file at `debt.file_path` was modified in the Delta
2. The violated rule is re-verified and now passes
3. Both conditions must be true for `mcp_t_debt_manage(resolve)` to execute

Partial resolution is not supported (1 debt = 1 rule violation).
