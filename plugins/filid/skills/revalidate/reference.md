# revalidate — Reference Documentation

Output templates, PR comment format, and verification reference for the
delta re-validation skill.

## verification-ledger.md Template

Authored and completed by the main orchestrator (Step 3 rows, Step 6
`post_count`/`status` derivation). One row per accepted fix:

```markdown
# Verification Ledger — <branch name>

**Resolve Commit**: <resolve_commit_sha>

| fix_id  | target_path           | rule_id            | pre_count | post_count | file_was_modified | status     |
| ------- | --------------------- | ------------------ | --------- | ---------- | ----------------- | ---------- |
| FIX-001 | packages/foo/index.ts | module-entry-point | 1         | 0          | true              | RESOLVED   |
| FIX-002 | src/legacy/big.ts     | lcom4              | 3         | 2          | true              | UNRESOLVED |
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

| Change   | Debt File    | Detail               |
| -------- | ------------ | -------------------- |
| CREATED  | <debt-id>.md | <from resolve>       |
| RESOLVED | <debt-id>.md | <rule now satisfied> |

## New Violations Check

| Check                   | Result       | Detail                |
| ----------------------- | ------------ | --------------------- |
| New critical violations | NONE / FOUND | <if found, list them> |

## Final Verdict

**<PASS|FAIL>** — <summary statement>

<If PASS>: All fixes resolved or validly deferred. PR is ready for merge.
<If FAIL>: Unresolved items remain — list them with what re-measurement showed.
```

Claim rows (`rule_id` = `CLM-*`) cite the re-judgment evidence in the
Detail column (observable evaluated → expected matched / not matched).

## PR Comment Format

`mcp__plugin_filid_t__review_manage(action: "format-revalidate-comment")`
reads `re-validate.md`, wraps it in a collapsible `<details>` section,
handles the 50,000-char limit, extracts the PASS/FAIL verdict, and
returns ready-to-post markdown. Post via `gh pr comment --body`.

```markdown
## Re-validation — ✅ PASS (or ❌ FAIL)

<details><summary>Re-validation Details</summary>

{full re-validate.md content}

</details>

> Full report: `.filid/review/<branch>/re-validate.md`
```

## Verification MCP Tool Map

| Fix rule kind       | Verification tool                                         | Pass condition         |
| ------------------- | --------------------------------------------------------- | ---------------------- |
| LCOM4 violation     | `mcp__plugin_filid_t__ast_analyze(lcom4)`                 | LCOM4 < 2              |
| CC violation        | `mcp__plugin_filid_t__ast_analyze(cyclomatic-complexity)` | CC <= 15               |
| 3+12 violation      | `mcp__plugin_filid_t__test_metrics(check-312)`            | All files PASS         |
| Structure violation | `mcp__plugin_filid_t__structure_validate`                 | No matching violations |
| Circular dependency | `mcp__plugin_filid_t__ast_analyze(dependency-graph)`      | No cycles              |
| Drift               | `mcp__plugin_filid_t__drift_detect`                       | No drift               |
| Document compliance | `mcp__plugin_filid_t__doc_compress(auto)` + Read          | INTENT.md <= 50 lines  |
| Acceptance claim    | none — direct re-judgment vs `.filid/criteria.md`         | claim judged PASS      |

## Non-Negotiable Rules (Constitutional)

These rules cannot be deferred via justification — any justification
attempting to is marked UNCONSTITUTIONAL:

1. **Hardcoded secrets/credentials** — always FAIL
2. **Circular dependencies** — always FAIL
3. **Security vulnerabilities** (injection, auth bypass) — always FAIL

## Debt Resolution Criteria

A debt item is resolved only when BOTH hold:

1. The file at `debt.file_path` was modified in the delta.
2. The violated rule re-verifies as satisfied.

Partial resolution is not supported (1 debt = 1 rule violation).
