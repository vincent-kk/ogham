---
name: filid-resolve
user_invocable: true
description: "[filid:filid-resolve] Resolve review fix requests by accepting or rejecting each item, applying accepted fixes via parallel code-surgeon subagents, recording ADR justifications for rejections, then auto-committing and pushing."
argument-hint: "[--auto]"
version: "2.0.0"
complexity: medium
plugin: filid
---

> **EXECUTION MODEL (Tier-2b interactive-aware)**: Execute all steps as a
> SINGLE CONTINUOUS OPERATION EXCEPT at steps explicitly marked
> `<!-- [INTERACTIVE] -->` or invoking `AskUserQuestion`. At THOSE EXACT
> steps, yielding is REQUIRED. At all other steps, NEVER yield.
>
> **Under `--auto` mode**: ALL `AskUserQuestion` invocations are skipped by
> design (see Step 2/3 auto branches). EXECUTION MODEL applies to every
> step without exception.
>
> **Valid reasons to yield**:
> 1. Interactive mode active AND current step is `[INTERACTIVE]`
> 2. User decision genuinely required (outside `--auto`)
> 3. Terminal stage marker emitted: `Resolve complete — N accepted` or `Resolve aborted`
>
> **HIGH-RISK YIELD POINTS**:
> - After `code-surgeon` parallel subagent returns — chain typecheck and commit in the same turn
> - After git commit+push — immediately chain `Skill("filid:filid-revalidate")` in the same turn (this is the primary stall point)
> - Interactive step completion (user responded) — chain next non-interactive step without delay
> - Justification collection loop — batch all rejections in the same turn when possible

# filid-resolve — Fix Request Resolution

Resolve fix requests from a completed code review. Present each item for
developer accept/reject, collect justifications for rejected items, refine
them into ADRs, create technical debt records, and auto-commit/push changes.

> **References**: `reference.md` (output templates, justification format).

## When to Use

- After `/filid:filid-review` generates `fix-requests.md`
- To selectively accept or reject fix requests with formal justification
- To create tracked technical debt for deferred fixes
- To auto-accept all fixes and run the full resolve→revalidate cycle (`--auto`)

## Core Workflow

### Step 1 — Branch Detection & Review Directory Lookup

1. **Pre-check — dirty working tree**:
   - Run: `git status --porcelain` (Bash)
   - If output is non-empty:
     - In `--auto` mode: **ABORT** with error "Working tree has uncommitted changes.
       Stash or commit them before running resolve --auto."
     - In interactive mode: warn and `AskUserQuestion`:
       <!-- [INTERACTIVE] AskUserQuestion: dirty worktree warning -->
       - "Working tree has uncommitted changes. These will be included in the
         auto-commit. Continue anyway?"
       - Options: "Continue anyway" / "Abort"
       - On "Abort": stop execution.

2. Detect branch: `git branch --show-current` (Bash)
3. Normalize: `mcp_t_review_manage(action: "normalize-branch", projectRoot: <project_root>, branchName: <branch>)` MCP tool
4. Verify: Read `.filid/review/<normalized>/fix-requests.md`
5. If not found: abort with "No fix requests found. Run /filid:filid-review first."

**→ Immediately proceed to Step 2.**

### Step 2 — Parse Fix Requests

Parse `fix-requests.md` to extract fix items. Each item has:

- Fix ID (e.g., `FIX-001`)
- Title, severity, file path, rule violated
- Recommended action and code patch
- **Type** (one of `code-fix`, `filid-promote`, `filid-restructure`; defaults to `code-fix` if absent)

Classify each item by type:
- `code-fix` — standard code patch (applied by code-surgeon)
- `filid-promote` — test.ts → spec.ts promotion (3+12 rule compliance)
- `filid-restructure` — module split/reorganization (LCOM4 >= 2 or structural drift)

> **Tolerant parser (permanent rule)**: `fix-requests.md` is hand-authored by
> the review phase and may carry a leading `filid:` prefix on type values
> (e.g., `filid:filid-promote`). Strip the `filid:` prefix before enum matching —
> treat `filid:filid-promote` and `filid-promote` as identical. Unknown tokens after
> stripping fall back to `code-fix` (the default). This normalization is
> permanent, not a migration grace period. See `src/types/handoff.ts`
> `normalizeFixRequestType` for the canonical implementation.

**→ Immediately proceed to Step 3.**

### Step 3 — Present Select List

> If `--auto` is set: **Accept ALL fix items. Skip `AskUserQuestion`.
> Proceed directly to Step 4.**

<!-- [INTERACTIVE] AskUserQuestion: per-fix accept/reject decision -->
Use `AskUserQuestion` to present each fix item for decision:

```
For each fix item:
  AskUserQuestion(
    question: "FIX-001: <title> (Severity: <severity>)\nPath: <path>\nAction: <recommended action>",
    options: [
      { label: "Accept", description: "Apply recommended fix" },
      { label: "Reject", description: "Reject and provide justification" }
    ]
  )
```

**→ Immediately proceed to Step 4.**

### Step 4 — Process Accepted Items

**Before dispatching any fixes**, capture the base SHA:

1. `base_sha = git rev-parse HEAD` (Bash) — store in memory.
   This is the pre-fix baseline. It will be written to `justifications.md`
   as `resolve_commit_sha` in Step 6.

#### Phase 4a — Code Fixes (parallel)

Delegate all accepted `code-fix` items **in parallel** as separate Task
subagents (`code-surgeon`, model: `sonnet`, `run_in_background: true`).

For each accepted code-fix, spawn one subagent with:
- The target file path
- The recommended action and code patch from `fix-requests.md`
- Instruction to apply the fix directly to the file

Await all code-surgeon subagents before Phase 4b.

#### Phase 4b — Structural Fixes (sequential, after code fixes)

After all code fixes are applied, process structural fix items **sequentially**:

For each accepted `filid-promote` item:
- Invoke `Skill("filid:filid-promote", "<target_path>")`.
- If the skill reports no eligible files, log as "SKIP — no stable test.ts found"
  and continue. This is non-blocking.

For each accepted `filid-restructure` item:
- Invoke `Skill("filid:filid-restructure", "<target_path> --auto-approve")`.
- If the skill fails or reports no actionable changes, log as
  "SKIP — restructure not applicable" and continue. This is non-blocking.

> **Important**: Structural fix failures MUST NOT block the pipeline.
> Log the result and continue to Step 5. The `filid:filid-revalidate` stage will
> catch any remaining issues.

**→ After all fixes (code + structural) complete, immediately proceed to Step 5.**

### Step 5 — Process Rejected Items

> If `--auto` is set: **Skip Step 5 entirely.** No rejected items exist
> in `--auto` mode.

For each rejected fix:

<!-- [INTERACTIVE] AskUserQuestion: rejection justification collection -->
1. **Collect justification**: Use `AskUserQuestion` with free text input
   to collect the developer's reason for rejection.

2. **Refine to ADR**: Transform the raw justification into a structured
   Architecture Decision Record:
   - Context: the original fix request and rule violated
   - Decision: defer the fix with stated rationale
   - Consequences: technical debt created, future impact

3. **Create debt file**: Call `mcp_t_debt_manage(create)` MCP tool:
   ```
   mcp_t_debt_manage(
     action: "create",
     projectRoot: <project_root>,
     debtItem: {
       fractal_path: <fractal path>,
       file_path: <file path>,
       created_at: <ISO date string>,
       review_branch: <branch>,
       original_fix_id: <FIX-ID>,
       severity: <"LOW"|"MEDIUM"|"HIGH"|"CRITICAL">,
       rule_violated: <rule>,
       metric_value: <current value>,
       title: <short title>,
       original_request: <original fix request text>,
       developer_justification: <developer justification>,
       refined_adr: <refined ADR text>
     }
   )
   ```

**→ Immediately proceed to Step 6.**

### Step 6 — Write justifications.md

Use the `base_sha` captured at the start of Step 4 (pre-fix HEAD) as
`resolve_commit_sha`. Do NOT run `git rev-parse HEAD` here — the base SHA
was already captured before any code changes.

> **Why**: `filid:filid-revalidate` computes `git diff resolve_commit_sha..HEAD`.
> After the auto-commit in Step 7, HEAD moves to the fix commit, so the
> delta correctly contains only the fix changes.

Write `.filid/review/<branch>/justifications.md` with frontmatter
containing `resolve_commit_sha` (= `base_sha`). See `reference.md` for
the full output template.

**→ Immediately proceed to Step 7.**

### Step 7 — Typecheck, Stage & Commit

If there were accepted fixes (files modified by code-surgeon):

1. **Pre-commit verification gate**:
   - Run: `npx tsc --noEmit` (Bash) from the project root (where `tsconfig.json` resides). In monorepo setups, ensure the correct `tsconfig.json` is used — add `--project <path>` if needed.
   - If typecheck **FAILS**:
     - In `--auto` mode: **ABORT** with error "Typecheck failed after
       applying fixes. Review code-surgeon output."
     - In interactive mode: warn and `AskUserQuestion`:
       <!-- [INTERACTIVE] AskUserQuestion: typecheck failure warning -->
       - "Typecheck failed after applying fixes. Commit anyway?"
       - Options: "Commit anyway" / "Abort and review"
       - On "Abort and review": stop here, do not commit.
   - If typecheck **PASSES**: proceed.

2. **Stage only code and debt files** (NOT review directory files):
   `git add <file1> <file2> ... <debt files if any>`
   - Include: files modified by code-surgeon + any debt files in `.filid/debt/` created in Step 5.
   - **Do NOT stage `justifications.md`** — it lives in `.filid/review/<branch>/` which is
     gitignored. It is an inter-stage communication file read by `filid:filid-revalidate` from local
     disk. Explicitly adding it via `git add` overrides `.gitignore` and pollutes the git tree.
   - **Do NOT stage any file under `.filid/review/`** — all review session artifacts are
     local-only and excluded by `.gitignore`.

3. **Construct commit message** from accepted fix IDs:
   ```
   fix(filid): resolve FIX-001, FIX-003 from review
   ```
   Format: `fix(filid): resolve <comma-separated accepted FIX-IDs> from review`

4. **Execute**: `git commit -m "<message>"` (Bash)

If there were **NO** accepted fixes (all rejected):

1. If debt files exist in `.filid/debt/`: stage only debt files, then commit:
   `chore(filid): record fix rejections from review`
2. If no debt files either (e.g., `--auto` with all accepted = 0 items): skip commit entirely.
   `justifications.md` is NOT committed — it stays as a local inter-stage file in
   `.filid/review/<branch>/`.
3. Skip typecheck (no code changes).

**→ Immediately proceed to Step 8.**

### Step 8 — Push

1. **Check upstream**: `git rev-parse --abbrev-ref @{upstream}` (Bash)
   - If no upstream (exit code != 0): skip push, inform user
     "No upstream branch. Push manually when ready." Then proceed to Step 9.
2. **Execute**: `git push` (Bash)
3. On **success**: **→ Immediately proceed to Step 9.**
4. On **failure**:
   - In `--auto` mode: **ABORT** with error "Push failed: `<error>`. Push manually and re-run `/filid:filid-pipeline --from=filid-revalidate`." Then END execution. Do NOT invoke `AskUserQuestion` (skipped by design in `--auto`).
   - In interactive mode: notify user via `AskUserQuestion`:
     <!-- [INTERACTIVE] AskUserQuestion: push failure warning -->
     - "Push failed: <error>. Resolve manually, then run /filid:filid-revalidate."
     - Options: "Continue to revalidate anyway" / "Stop here"
     - On "Continue to revalidate anyway": **→ Immediately proceed to Step 9.**
     - On "Stop here": **END execution.**

### Step 9 — Offer to Run `filid:filid-revalidate` <!-- [INTERACTIVE] AskUserQuestion: revalidate offer (accepted / all-rejected branches) -->

> If `--auto` is set: **Skip `AskUserQuestion`. Automatically invoke
> `/filid:filid-revalidate`.** Then end execution.

```
If there were accepted fixes:
  AskUserQuestion(
    question: "Fixes committed and pushed. Run revalidate now?",
    options: [
      { label: "Yes — run now", description: "Invoke /filid:filid-revalidate" },
      { label: "Not now",       description: "Run /filid:filid-revalidate later manually" }
    ]
  )
  → On "Yes — run now": invoke /filid:filid-revalidate
  → On "Not now": done

If there were NO accepted fixes (all rejected):
  If `--auto` is set: Automatically invoke /filid:filid-revalidate — no pending code changes needed.
  If interactive mode: AskUserQuestion(
    question: "All fix items were rejected. Run revalidate now to evaluate justifications?",
    options: [
      { label: "Yes — run now", description: "Invoke /filid:filid-revalidate" },
      { label: "Not now",       description: "Run /filid:filid-revalidate later manually" }
    ]
  )
  → On "Yes — run now": invoke /filid:filid-revalidate
  → On "Not now": done
  `filid:filid-revalidate` will find zero accepted items, evaluate only the rejected-item
  justifications and debt records, and return PASS if all justifications are
  constitutionally compliant.
```

**After `filid:filid-revalidate` is invoked (or skipped), execution is COMPLETE.**

## Available MCP Tools

| Tool             | Action             | Purpose                                                  |
| ---------------- | ------------------ | -------------------------------------------------------- |
| `mcp_t_review_manage`  | `normalize-branch` | Normalize branch name for review directory path          |
| `mcp_t_debt_manage`    | `create`           | Create a technical debt record for each rejected fix     |

## Options

> Options are LLM-interpreted hints, not strict CLI flags. Natural language works equally well.

```
/filid:filid-resolve [--auto]
```

| Option   | Type | Default | Description                                                          |
| -------- | ---- | ------- | -------------------------------------------------------------------- |
| `--auto` | flag | off     | Accept all fixes, skip user prompts, auto-commit/push/revalidate     |

Current branch auto-detected. No other parameters required.

## Quick Reference

```
/filid:filid-resolve           # Interactive resolve on current branch
/filid:filid-resolve --auto    # Accept all, commit, push, revalidate automatically

Input:    .filid/review/<branch>/fix-requests.md
Outputs:  justifications.md, .filid/debt/*.md (per rejected item), git commit + push
Prereq:   /filid:filid-review must have completed
Next:     /filid:filid-revalidate (auto-chained or manual)

Steps:    1 (Branch + dirty check) → 2 (Parse) → 3 (Select) → 4 (Code-surgeon + base SHA)
          → 5 (Rejected items) → 6 (justifications.md) → 7 (Typecheck + commit)
          → 8 (Push) → 9 (Revalidate)

Agents:    code-surgeon (Step 4a — parallel code-fix)
Skills:    filid:filid-promote (Step 4b), filid:filid-restructure (Step 4b)
MCP tools: mcp_t_review_manage(normalize-branch), mcp_t_debt_manage(create)

--auto:   Skips Steps 3 (accept all), 5 (no rejections), 9 prompt (auto-revalidate)
          Aborts on: dirty working tree, typecheck failure
```
