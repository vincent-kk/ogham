---
name: resolve
user-invocable: true
description: 'Present all cross-review fix requests as one batched decision sheet, delegate accepted corrections, record rejections, then gate and commit. Use after cross-review returns REQUEST_CHANGES.'
argument-hint: '[--auto] [--base REF]'
version: '1.0.0'
complexity: complex
plugin: filid
---

# resolve — Decide, Delegate, Record

Run this skill as one continuous operation. Yield only at the marked interactive steps. Ending after the commit **is not** completion — the terminal output and the revalidate handoff are part of this skill.

**This skill does not write code.** It owns the procedure: one complete decision sheet for all fix requests, batched decisions, delegation of accepted corrections, a justification record for rejections, a verification gate, and a commit. The correction itself is applied by the main agent or another plugin.

## References

Resolve files relative to this `SKILL.md`:

- `reference.md` — `justifications.md` template, recommendation rubric, decision sheet and batch input, delegation brief, per-severity gate.

## Step 1 — Locate the review state

```text
mcp__plugin_filid_tools__review_state({
  action: "checkpoint",
  projectRoot: PROJECT_ROOT,
  branchName: BRANCH,
  baseRef: BASE_REF
})
```

Use `data.reviewDirectory` as `REVIEW_DIR`; **never derive a directory name.**

| Disposition | Action                                                                   |
| ----------- | ------------------------------------------------------------------------ |
| `missing`   | Abort — no review to resolve. Run `/filid:cross-review` first.           |
| `stale`     | Abort — the source moved since the review. Re-run `/filid:cross-review`. |
| `resumable` | Continue.                                                                |
| `cached`    | Continue.                                                                |

`REVIEW_DIR/fix-requests.md` must exist. Its absence means the verdict was not `REQUEST_CHANGES`; report that and end.

## Step 2 — Read the fix requests

Parse the canonical FIX ID from each `## FIX-NNN:` heading in `fix-requests.md`, together with the complete original finding fields: Severity, Category, Path, Rule, Claim, Evidence, Consequence, and Recommended Action (schema in `../cross-review/templates.md`, which produced the file).

Do not invent items, renumber a FIX ID, or merge two findings into one decision. Preserve the canonical FIX ID through the decision sheet and the item heading under `justifications.md`'s `## Accepted` section so revalidate can join it back to exactly one original fix request.

Classify each item with the recommendation rubric in `reference.md` §3. Keep Severity and Category as finding facts; neither determines Recommendation by itself. Record Recommendation, Default, and a one-sentence recommendation reason for every item. Perform this classification under `--auto` too, because the sheet must preserve which corrections were originally contentious.

<!-- resolve:all-fixes-ready -->

## Step 3 — Present and decide the batch

<!-- resolve:batch-decision:start -->

<!-- resolve:decision-sheet -->

Before any prompt, render the complete decision sheet in `reference.md` §4:

1. Show counts for total, error, warning, Apply recommendation, and Discuss recommendation.
2. Show every `[?] Discuss` item under **Needs attention** first.
3. Show every `[x] Apply` item under **Selected by default** second.
4. Under the summary, show each item's Consequence, Recommended Action, and Recommendation reason. Do not omit an item from the details or collapse two FIX IDs into one row.

<!-- resolve:auto-decision -->

Under `--auto`, keep each original Recommendation and reason visible, change only every Default/Decision to `[x] Apply (auto-selected)`, and report recommendation counts separately from final decision counts. Accept every item and continue to Step 4 without prompting.

<!-- [INTERACTIVE] AskUserQuestion: batch decision sheet -->

Interactive only: use AskUserQuestion once per batch round with exactly two fixed options:

- **Apply recommended set** — accept every `[x] Apply`; keep `[?] Discuss` items unresolved.
- **Apply every item** — accept every item, including the Discuss group.

The host's automatic **Other** field is the arbitrary-size control. Parse all ID-specific overrides, questions, deferrals, and rejections from one response using the grammar in `reference.md` §4. IDs omitted from Other keep their displayed defaults.

Answer all `discuss` questions together, then re-render only the still-unresolved items in one batch. Validate unknown IDs, error skips, and missing skip/reject reasons together and return the whole invalid set in one response. Never open a separate prompt for one FIX. Finish Step 3 only when every item is accepted, deferred, or rejected; an error may be accepted or rejected with a reason, but not skipped.

Before closing the batch, refine every skip/reject reason into Context / Decision / Consequences with `reference.md` §2. Return all incomplete ADRs together and keep those items unresolved until the same batch supplies valid replacements. Store the completed ADR fields with the decisions. Do not capture the baseline or delegate any correction until this validation is complete.

<!-- resolve:rejections-validated -->

<!-- resolve:batch-decision:end -->

## Step 4 — Capture the baseline, then delegate

**First** capture the pre-correction baseline:

```text
base_sha = git rev-parse HEAD
```

This value is written to `justifications.md` as `resolve_commit_sha`. `revalidate` diffs `resolve_commit_sha..HEAD`, so it must be read **before** any correction lands.

Then hand the accepted items out, routing each by the table in `reference.md` §5 and dispatching them together:

- main-agent items get a delegation brief in the §5 format, applied directly in this turn;
- when another skill owns the correction, invoke it with the input that skill actually takes — a placement request for `/filid:restructure`, the owning fractal path and `--include-detail` for `/filid:enrich-docs`. Neither receives the brief. With `--auto`, append `--auto-approve` to both child skills as specified in §5; interactive invocations omit it.

This skill states **what must change and where**. It does not choose the edit, and it never edits a file itself.

After delegation, confirm with `git status --porcelain` that something changed for each accepted item. An accepted item with no corresponding change is reported in the terminal output as `unapplied` and is **not** silently dropped.

## Step 5 — Record rejections

Skipped under `--auto`.

<!-- resolve:rejections-from-batch -->

<!-- resolve:serialize-rejections-only -->

For every rejected or deferred item, append the already-validated Context / Decision / Consequences fields to the `## Rejected` section of `justifications.md`. This step serializes the decisions; it does not refine reasons, reopen a decision, or prompt again.

There is no separate debt ledger in 1.0. `justifications.md` is the record, and `revalidate` reads it to judge whether each rejection holds.

## Step 6 — Write `justifications.md`

Write `REVIEW_DIR/justifications.md` from the template in `reference.md` §1, with frontmatter `resolve_commit_sha: <base_sha>` — the Step 4 value, **not** current `HEAD`. Copy each accepted item's canonical FIX ID unchanged into that item's heading under `## Accepted`; that ID is revalidate's join key into `fix-requests.md`. After the Step 7 commit `HEAD` moves, and the delta must contain only the correction changes.

## Step 7 — Gate and commit

1. Run the repository typecheck. On failure:
   - interactive → report and stop before committing;
   - `--auto` → **abort** with `Typecheck failed after applying fixes.`
2. Stage the corrected source paths only. **Never stage `justifications.md` or anything under `.filid/review/`** — those are local inter-stage files, and an explicit `git add` overrides `.gitignore`.
3. Commit: `fix(filid): apply cross-review corrections`.
4. With no accepted items, skip the typecheck and the commit entirely.

## Step 8 — Hand off

```text
Resolve: accepted <n>, rejected <m>, unapplied <k>
Next: /filid:revalidate
```

Interactive runs may ask whether to run `revalidate` now. `--auto` runs never ask — `pipeline` chains the next stage itself.

## Options

| Option       | Type   | Default | Effect                                                             |
| ------------ | ------ | ------- | ------------------------------------------------------------------ |
| `--auto`     | flag   | off     | Show the sheet, auto-select all decisions, skip prompts and Step 5 |
| `--base REF` | string | auto    | Base ref passed through to `review_state`                          |

## Invariants

- No code is authored here. Accepted items are delegated; rejected items are recorded.
- Every fix request appears in one focus-first decision sheet before any interactive prompt.
- Interactive decisions and discussion are batched; no FIX gets its own prompt.
- `--auto` preserves recommendation signals while auto-selecting every decision.
- `resolve_commit_sha` is captured before any correction lands.
- An accepted item that produced no change is reported, never hidden.
- Review artifacts are never committed.
- No debt record is created. `justifications.md` is the single rejection record.
