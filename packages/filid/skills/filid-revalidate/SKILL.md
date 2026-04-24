---
name: filid-revalidate
user_invocable: true
description: "[filid:filid-revalidate] Extract delta since resolve_commit_sha, verify accepted fixes resolved their issues, check rejected justifications for constitutional compliance, then render a final PASS or FAIL verdict with optional PR comment."
argument-hint: ""
version: "1.0.0"
complexity: complex
plugin: filid
---

> **EXECUTION MODEL**: Execute all steps as a SINGLE CONTINUOUS OPERATION.
> After each step completes, IMMEDIATELY proceed to the next.
> NEVER yield the turn after parallel subagents return or MCP tools complete.
> Large diff outputs are internal working data — do NOT summarize to the user.
>
> **Valid reasons to yield**:
> 1. User decision genuinely required
> 2. Terminal stage marker emitted: `Revalidate verdict: (PASS|FAIL)`
>
> **HIGH-RISK YIELD POINTS**:
> - After parallel verification subagents return — chain verdict aggregation and `re-validate.md` write in the same turn
> - After PR comment post — emit final verdict in the same turn

# filid-revalidate — Delta Re-validation

Perform lightweight re-validation after fix resolution. Extract the Delta
since `resolve_commit_sha`, verify fixes resolved their issues, and render
a final PASS/FAIL verdict. Optionally post the result as a PR comment.

> **References**: `reference.md` (output templates, PR comment format).

## When to Use

- After `/filid:filid-resolve` and applying accepted fixes
- To verify that code changes address the original fix requests
- To get final PASS/FAIL verdict before PR merge

## Core Workflow

### Step 1 — Branch Detection & File Loading

1. Detect branch: `git branch --show-current` (Bash)
2. Normalize: `mcp_t_review_manage(action: "normalize-branch", projectRoot: <project_root>, branchName: <branch>)` MCP tool
3. Load review files from `.filid/review/<normalized>/`:
   - `review-report.md` — original review findings
   - `fix-requests.md` — original fix requests
   - `justifications.md` — resolution decisions + `resolve_commit_sha`
4. If any file missing: abort with guidance message.

**→ Immediately proceed to Step 2.**

### Step 2 — Extract Delta

Extract `resolve_commit_sha` from `justifications.md` frontmatter.

```bash
git diff <resolve_commit_sha>..HEAD --name-only
git diff <resolve_commit_sha>..HEAD --stat
```

For semantic analysis on changed files:

```
mcp_t_ast_analyze(source: <new>, oldSource: <old>, analysisType: "tree-diff")
```

**→ Immediately proceed to Steps 3-5 (parallel).**

### Steps 3–5 (Parallel — after Step 2)

Steps 3, 4, and 5 are **independent** and run **in parallel** as separate Task
subagents (`run_in_background: true`). Each verification step runs as a
`general-purpose` subagent (`subagent_type: "general-purpose"`) with
`run_in_background: true`. Await all three before Step 6.

**→ After all three subagents complete, immediately proceed to Step 6. Do NOT summarize individual results to the user.**

### Step 3 — Emit ledger row per accepted fix (Writer Responsibility)

> **Writer Responsibility** (see DETAIL.md `## API Contracts`): the Step 3
> subagent is the writer of the raw ledger row. The main orchestrator in
> Step 6 is the sole authority for post-fix counts and RESOLVED/UNRESOLVED
> status. Writing anything other than the literal `TBD` token in
> `post_count` or `status` is a protocol violation — main will log a
> warning and discard those fields before re-deriving them.

For each accepted fix item from `justifications.md`, append one row to
`<REVIEW_DIR>/verification-ledger.md` using **exactly** this template:

```markdown
| fix_id | target_path | rule_id | pre_count | post_count | file_was_modified | status |
| ------ | ----------- | ------- | --------- | ---------- | ----------------- | ------ |
| FIX-001 | <target_path> | <rule_id> | <integer from review-report> | TBD | <true|false> | TBD |
```

Fill `pre_count` from `review-report.md` / `fix-requests.md`. Fill
`file_was_modified` from `git diff <resolve_commit_sha>..HEAD --name-only`.
**Leave `post_count` and `status` as the literal string `TBD`** — do NOT
re-run `mcp_t_structure_validate` from this subagent and do NOT judge
RESOLVED/UNRESOLVED from file diffs. If a row cannot be authored (fix
metadata incomplete), still write a row with `post_count: TBD`,
`status: TBD` and a `# incomplete: <reason>` line directly beneath it so
Step 6 can detect the gap.

### Step 4 — Verify Justifications (Constitutional Check)

For each rejected fix with justification:

1. Confirm the justification does not violate non-negotiable rules:
   - Hardcoded secrets — always FAIL regardless of justification
   - Circular dependencies — always FAIL regardless of justification
   - Security vulnerabilities (injection, auth bypass) — always FAIL regardless of justification
2. Verify debt file was created via `mcp_t_debt_manage(list)`
3. Mark as DEFERRED (valid) or UNCONSTITUTIONAL (invalid justification)

### Step 5 — Resolve Cleared Debt

Check if any Delta changes also resolve existing debt items:

```
mcp_t_debt_manage(action: "list", projectRoot: <project_root>)
```

For each debt item whose `file_path` is in the Delta:

1. Re-run the relevant MCP tool to check if the rule is now satisfied
2. If satisfied: `mcp_t_debt_manage(action: "resolve", projectRoot: <root>, debtId: <id>)`

### Step 6 — Re-derive ledger + render verdict (Sequential — after Steps 3–5)

> Step 6 runs in the **main orchestrator**, never in a subagent. The
> subagent-authored rows from Step 3 are treated as untrusted input: main
> is the writer of truth for `post_count` and `status`.

**Step 6.1 — Parse-fail gate.** Read `<REVIEW_DIR>/verification-ledger.md`.
If the file is missing, or any row is malformed (column count != 7,
missing `fix_id`, or `pre_count` not a non-negative integer), pin
verdict to `FAIL` with reason `verification-ledger.md parse failed`
and jump to the verdict write step.

**Step 6.2 — Detect tampering.** For each row:

- If `post_count != "TBD"` OR `status != "TBD"`, append
  `[filid:warn] subagent tampered ledger row <fix_id>: post_count=<...>, status=<...> (discarded)`
  to `session.md`, then overwrite those fields with `TBD` in memory
  before moving on.

**Step 6.3 — Detect missing rows.** Compare the ledger row set with the
accepted fix id set from `justifications.md`. For each accepted fix with
no row, synthesise a row with `post_count: <main-derived>`,
`status: UNRESOLVED` and reason `auto-UNRESOLVED: ledger row absent`.

**Step 6.4 — Independently re-derive post_count.** For each row, call
`mcp_t_structure_validate(path=<target_path>)` (or the category-specific
MCP tool for LCOM4/CC/3+12 — see table below). Filter violations by
`ruleId == <rule_id>` and `path starts with <target_path>`. Write the
integer count into `post_count`.

| rule_id kind             | MCP tool                              | success = |
| ------------------------ | ------------------------------------- | --------- |
| structure violation      | `mcp_t_structure_validate`            | 0 matching violations |
| LCOM4 violation          | `mcp_t_ast_analyze(analysisType: "lcom4", className)` | LCOM4 < 2 |
| CC violation             | `mcp_t_ast_analyze(analysisType: "cyclomatic-complexity")` | CC <= 15 |
| 3+12 violation           | `mcp_t_test_metrics(action: "check-312")` | PASS |

**Step 6.5 — Derive status.** Apply the DETAIL.md matrix
`(pre_count, post_count, file_was_modified) → status`. The only path to
`RESOLVED` is `pre > 0 ∧ post == 0 ∧ file_was_modified` (or the vacuous
`pre == 0 ∧ post == 0`). File-diff matching the fix-requests patch is
necessary but NOT sufficient.

**Step 6.6 — Pin verdict on UNRESOLVED.** If any row has
`status == UNRESOLVED`, verdict is `FAIL` (unoverridable — no subagent
judgement can flip it).

**PASS conditions** (all must be true):

- Every ledger row has `status == RESOLVED` after Step 6.5 derivation.
- All justifications are constitutionally valid (DEFERRED, not UNCONSTITUTIONAL).
- No new critical violations introduced in the Delta.

**FAIL conditions** (any triggers FAIL):

- Ledger parse failed (Step 6.1 gate).
- One or more derived rows are `UNRESOLVED`.
- A justification is UNCONSTITUTIONAL (non-negotiable rule violated).
- New critical violations found in Delta changes.

Write `.filid/review/<branch>/re-validate.md` with the verdict and the
fully-derived ledger (including any `[filid:warn] subagent tampered ...`
lines appended to `session.md` for auditability). See `reference.md` for
the output template.

**→ Immediately proceed to Step 7.**

### Step 7 — PR Comment (Optional)

Post verdict to PR if GitHub CLI is available:

1. Call `mcp_t_review_manage(action: "format-revalidate-comment", projectRoot: <project_root>, branchName: <branch>)` to get the formatted markdown.
2. Check: `gh auth status` (Bash)
3. If authenticated: `gh pr comment --body "<markdown>"` (Bash) — use the `markdown` field from the tool result as-is.
4. If not authenticated: skip with info message.

> **Language**: All output files and PR comments MUST be written in the language
> specified by the `[filid:lang]` tag in system context (configured in `.filid/config.json`).
> If no tag is present, follow the system's language setting; default to English. This applies to re-validate.md,
> PR comments, and any additional commentary. Technical terms, code identifiers,
> rule IDs, and file paths remain in their original form.

**→ Immediately proceed to Step 8.**

### Step 8 — Cleanup on PASS

After Step 7, if the verdict is **PASS**:

```
mcp_t_review_manage(action: "cleanup", projectRoot: <project_root>, branchName: <branch>)
```

This deletes the entire `.filid/review/<branch>/` directory (session artifacts,
review report, fix requests, justifications, `verification-ledger.md`,
re-validate report).

**Debt files are NOT affected** — they live in `.filid/debt/` and are managed
separately by `mcp_t_debt_manage`.

If the verdict is **FAIL**, skip cleanup so the developer can inspect the
remaining unresolved items.

**After cleanup completes (or is skipped on FAIL), execution is COMPLETE.**

## Available MCP Tools

| Tool                 | Action             | Purpose                                                         |
| -------------------- | ------------------ | --------------------------------------------------------------- |
| `mcp_t_review_manage`      | `normalize-branch` | Normalize branch name for review directory path                 |
| `mcp_t_review_manage`      | `cleanup`          | Delete review session directory on PASS                         |
| `mcp_t_ast_analyze`        | `tree-diff`        | Semantic diff of changed files since resolve_commit_sha         |
| `mcp_t_ast_analyze`        | `lcom4`            | Verify LCOM4 < 2 after accepted fix                             |
| `mcp_t_ast_analyze`        | `cyclomatic-complexity` | Verify CC <= 15 after accepted fix                         |
| `mcp_t_test_metrics`       | `check-312`        | Verify 3+12 rule PASS after accepted fix                        |
| `mcp_t_structure_validate` | —                  | Verify structure violation resolved after accepted fix          |
| `mcp_t_debt_manage`        | `list`             | Retrieve existing debt items to check for resolution            |
| `mcp_t_debt_manage`        | `resolve`          | Mark a debt item as resolved when its rule is now satisfied     |
| `mcp_t_review_manage`      | `format-revalidate-comment` | Format re-validation results into collapsible PR comment |

## Options

> Options are LLM-interpreted hints, not strict CLI flags. Natural language works equally well.

```
/filid:filid-revalidate
```

No parameters. Current branch auto-detected.

## Quick Reference

```
/filid:filid-revalidate    # Re-validate on current branch

Input:    justifications.md (resolve_commit_sha), fix-requests.md, review-report.md
Output:   re-validate.md, PR comment (optional)
Prereq:   /filid:filid-resolve must have completed + fixes applied
Verdict:  PASS | FAIL

Steps:    1 (Load) → 2 (Delta) → [3 + 4 + 5 in parallel] → 6 (Verdict) → 7 (PR) → 8 (Cleanup on PASS)
MCP tools: mcp_t_review_manage(normalize-branch, cleanup), mcp_t_ast_analyze(tree-diff, lcom4, cyclomatic-complexity),
           test_metrics(check-312), structure_validate, mcp_t_debt_manage(list, resolve)
Cleanup:  PASS → .filid/review/<branch>/ deleted | FAIL → kept for inspection
```
