---
name: revalidate
user_invocable: true
description: '[filid:revalidate] Extract delta since resolve_commit_sha, re-measure each accepted fix to verify it resolved its issue, check rejected justifications for constitutional compliance, then render a final PASS or FAIL verdict with optional PR comment.'
argument-hint: ''
version: '2.0.1'
complexity: complex
plugin: filid
---

> **EXECUTION MODEL (Tier-2a Anti-Yield)**: Execute all steps as a SINGLE
> CONTINUOUS OPERATION. After each step completes, IMMEDIATELY proceed to
> the next. NEVER yield after parallel subagents return or MCP tools
> complete. Large diff outputs are internal working data — do NOT
> summarize them to the user.
>
> **Valid reasons to yield**:
>
> 1. User decision genuinely required
> 2. Terminal stage marker emitted: `Revalidate verdict: (PASS|FAIL)`
>
> **HIGH-RISK YIELD POINTS**:
>
> - After parallel subagents return — chain re-derivation, verdict, and
>   the `re-validate.md` write in the same turn
> - After the PR comment post — emit the final verdict in the same turn

# revalidate — Delta Re-validation

Verify that resolution actually happened: extract the delta since
`resolve_commit_sha`, independently **re-measure** every accepted fix
(file-diff matching is never sufficient), constitutionally check every
rejected justification, and render PASS/FAIL. The main orchestrator is
the sole author of fix statuses — no subagent judgment can flip them.

> **References**: `reference.md` (output templates, verification tool
> map, constitutional rules). `spec.md` (status derivation matrix).

## When to Use

- After `/filid:resolve` has applied accepted fixes
- To verify code changes address the original fix requests
- To get the final PASS/FAIL verdict before PR merge

## Core Workflow

### Step 1 — Branch Detection & File Loading

1. Detect branch: `git branch --show-current` (Bash)
2. `mcp__plugin_filid_tools__review_manage(action: "normalize-branch", projectRoot, branchName)`
3. Load from `.filid/review/<normalized>/`: `review-report.md`,
   `fix-requests.md`, `justifications.md` (contains
   `resolve_commit_sha`).
4. Any file missing → abort with guidance ("Run /filid:resolve first.").

**→ Immediately proceed to Step 2.**

### Step 2 — Extract Delta

Extract `resolve_commit_sha` from `justifications.md` frontmatter, then:

```bash
git diff <resolve_commit_sha>..HEAD --name-only
git diff <resolve_commit_sha>..HEAD --stat
```

**→ Immediately proceed to Step 3.**

### Step 3 — Build the Verification Ledger (main)

For each **accepted** fix in `justifications.md`, the main orchestrator
appends one row to `<REVIEW_DIR>/verification-ledger.md` (template:
`reference.md`):

| Field               | Source                                                                                |
| ------------------- | ------------------------------------------------------------------------------------- |
| `fix_id`            | justifications.md                                                                     |
| `target_path`       | fix-requests.md `Path`                                                                |
| `rule_id`           | fix-requests.md `Rule`                                                                |
| `pre_count`         | review-report.md / fix-requests.md finding count (acceptance-claim rows `CLM-*`: `1`) |
| `file_was_modified` | `target_path` present in the Step 2 name-only diff                                    |
| `post_count`        | derived in Step 6 — leave blank here                                                  |
| `status`            | derived in Step 6 — leave blank here                                                  |

`accepted_count == 0` (all-rejected resolve) → skip the ledger; the
verdict derives solely from Step 4.

**→ Immediately proceed to Steps 4–5 (parallel).**

### Steps 4–5 (Parallel subagents)

Steps 4 and 5 are independent — spawn both **in the same response** as
parallel foreground `general-purpose` subagents
(`run_in_background: false` — a background spawn returns a task id
instead of the result and stalls the pipeline); both results return
together before Step 6.

**Step 4 — Verify justifications (constitutional check).** For each
rejected fix with a justification:

1. The justification must not defer a non-negotiable rule
   (`reference.md` → "Non-Negotiable Rules"): hardcoded secrets,
   circular dependencies, security vulnerabilities — always FAIL
   regardless of justification quality.
2. Verify the debt record exists via `mcp__plugin_filid_tools__debt_manage(action: "list", ...)`.
3. Mark DEFERRED (valid) or UNCONSTITUTIONAL (invalid).

**Step 5 — Resolve cleared debt.** For each existing debt item
(`mcp__plugin_filid_tools__debt_manage(action: "list", ...)`) whose
`file_path` is in the delta: re-run the relevant MCP measurement; if the
rule is now satisfied,
`mcp__plugin_filid_tools__debt_manage(action: "resolve", projectRoot, debtId)`.

**→ After both subagents complete, immediately proceed to Step 6. Do NOT summarize their outputs.**

### Step 6 — Re-derive & Render Verdict (main)

Runs in the **main orchestrator**, never a subagent — revalidate's
verdict rests on main's own measurements.

**6.1 — Re-measure `post_count`** for every ledger row via the
category-specific MCP tool, filtering violations by
`ruleId == <rule_id>` and `path` prefix `<target_path>`:

| rule_id kind               | MCP tool                                                                      | success =             |
| -------------------------- | ----------------------------------------------------------------------------- | --------------------- |
| structure violation        | `mcp__plugin_filid_tools__structure_validate`                                 | 0 matching violations |
| LCOM4 violation            | `mcp__plugin_filid_tools__ast_analyze(analysisType: "lcom4", className)`      | LCOM4 < 2             |
| CC violation               | `mcp__plugin_filid_tools__ast_analyze(analysisType: "cyclomatic-complexity")` | CC <= 15              |
| 3+12 violation             | `mcp__plugin_filid_tools__test_metrics(action: "check-gate")`                 | PASS                  |
| acceptance claim (`CLM-*`) | NONE — claim re-judgment (below)                                              | claim judged PASS     |

> **Claim re-judgment (`rule_id` matching `CLM-\d+`)**: measurement
> tools can never report a CLM rule, so counting would auto-resolve the
> exact item class the oracle ledger gates. Instead, main re-judges the
> claim directly: read it from `.filid/criteria.md`, evaluate its
> `observable` (run the named test/command via Bash when executable;
> otherwise inspect the named artifact), and compare against `expected`.
> `post_count := 0` ONLY on PASS with cited evidence (record the
> evidence line in `re-validate.md`); otherwise `post_count := 1`. A
> claim is NEVER resolved by file modification alone.

**6.2 — Derive `status`** per row via the `spec.md` matrix
`(pre_count, post_count, file_was_modified) → status`. The only path to
`RESOLVED` is `pre > 0 ∧ post == 0 ∧ file_was_modified` (or the vacuous
`pre == 0 ∧ post == 0`). A file-diff matching the fix patch is necessary
but NOT sufficient.

**6.3 — Verdict.** PASS requires ALL of:

- every ledger row `status == RESOLVED`;
- every justification DEFERRED (none UNCONSTITUTIONAL);
- no new critical violations introduced in the delta (surfaced by the
  Step 6.1 re-measurements).

Any row `UNRESOLVED`, any UNCONSTITUTIONAL justification, or a new
critical violation → FAIL (unoverridable).

Write `.filid/review/<branch>/re-validate.md` with the verdict and the
fully-derived ledger (template: `reference.md`).

**→ Immediately proceed to Step 7.**

### Step 7 — PR Comment (Optional)

1. `mcp__plugin_filid_tools__review_manage(action: "format-revalidate-comment", projectRoot, branchName)`
   → formatted markdown.
2. `gh auth status` (Bash); authenticated →
   `gh pr comment --body "<markdown>"`; otherwise skip with an info
   message.

> **Language**: output files and PR comments follow the `[filid:lang]`
> tag (default English); technical terms, identifiers, rule IDs, and
> paths stay in original form.

**→ Immediately proceed to Step 8.**

### Step 8 — Cleanup on PASS

- **PASS** → `mcp__plugin_filid_tools__review_manage(action: "cleanup", projectRoot, branchName)`
  — deletes the whole `.filid/review/<branch>/` session directory. Debt
  files in `.filid/debt/` are NOT affected.
- **FAIL** → skip cleanup so the developer can inspect unresolved items.

Emit the terminal marker: `Revalidate verdict: <PASS|FAIL>`.

**After cleanup completes (or is skipped on FAIL), execution is COMPLETE.**

## Available MCP Tools

| Tool                                          | Action                           | Purpose                                  |
| --------------------------------------------- | -------------------------------- | ---------------------------------------- |
| `mcp__plugin_filid_tools__review_manage`      | `normalize-branch`               | Review directory resolution              |
| `mcp__plugin_filid_tools__review_manage`      | `cleanup`                        | Delete session directory on PASS         |
| `mcp__plugin_filid_tools__structure_validate` | —                                | Re-measure structure violations (Step 6) |
| `mcp__plugin_filid_tools__ast_analyze`        | `lcom4`, `cyclomatic-complexity` | Re-measure metrics (Step 6)              |
| `mcp__plugin_filid_tools__test_metrics`       | `check-gate`                     | Re-measure test compliance (Step 6)      |
| `mcp__plugin_filid_tools__debt_manage`        | `list`, `resolve`                | Debt verification & clearing (Steps 4–5) |
| `mcp__plugin_filid_tools__review_manage`      | `format-revalidate-comment`      | PR comment formatting (Step 7)           |

## Options

No parameters. Current branch auto-detected.

## Quick Reference

```
/filid:revalidate

Input:   justifications.md (resolve_commit_sha), fix-requests.md, review-report.md
Output:  re-validate.md, PR comment (optional)
Verdict: PASS | FAIL

Steps:   1 Load → 2 Delta → 3 Ledger (main) → [4 ∥ 5 subagents] →
         6 Re-measure + verdict (main) → 7 PR comment → 8 Cleanup on PASS
Rule:    RESOLVED requires pre > 0 ∧ post == 0 ∧ file modified —
         re-measured by main, never assumed from diffs
```
