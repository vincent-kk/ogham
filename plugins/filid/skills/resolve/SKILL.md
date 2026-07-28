---
name: resolve
user_invocable: true
description: '[filid:resolve] Decide each cross-review fix request, delegate accepted corrections outward, record rejection justifications, then gate and commit the result.'
argument-hint: '[--auto] [--base REF]'
version: '1.0.0'
complexity: complex
plugin: filid
---

# resolve — Decide, Delegate, Record

Run this skill as one continuous operation. Yield only at the marked interactive steps. Ending after the commit **is not** completion — the terminal output and the revalidate handoff are part of this skill.

**This skill does not write code.** It owns the procedure: a decision per fix request, delegation of accepted corrections, a justification record for rejections, a verification gate, and a commit. The correction itself is applied by the main agent or another plugin.

## References

Resolve files relative to this `SKILL.md`:

- `reference.md` — `justifications.md` template, ADR refinement rules, delegation brief format, per-severity gate.

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

Parse each `## FIX-NNN:` block from `fix-requests.md`. Every block carries Severity, Perspective, Path, Rule, Evidence, Consequence, and Recommended Action (schema in the cross-review `templates.md`).

Do not invent items and do not merge two findings into one decision.

## Step 3 — Decide each item

<!-- [INTERACTIVE] AskUserQuestion: per-item accept or reject -->

For each item, ask with `AskUserQuestion`:

```text
FIX-NNN: <title> (Severity: <severity>)
Path: <path>
Recommended Action: <action>
```

Options: **Accept** (apply the recommended correction) / **Reject** (decline with a justification).

`--auto` accepts every item without prompting and skips Step 5 entirely.

## Step 4 — Capture the baseline, then delegate

**First** capture the pre-correction baseline:

```text
base_sha = git rev-parse HEAD
```

This value is written to `justifications.md` as `resolve_commit_sha`. `revalidate` diffs `resolve_commit_sha..HEAD`, so it must be read **before** any correction lands.

Then hand the accepted items out, routing each by the table in `reference.md` §3 and dispatching them together:

- main-agent items get a delegation brief in the §3 format, applied directly in this turn;
- when another skill owns the correction, invoke it with the input that skill actually takes — a placement request for `/filid:restructure`, the owning fractal path for `/filid:enrich-docs`. Neither receives the brief.

This skill states **what must change and where**. It does not choose the edit, and it never edits a file itself.

After delegation, confirm with `git status --porcelain` that something changed for each accepted item. An accepted item with no corresponding change is reported in the terminal output as `unapplied` and is **not** silently dropped.

## Step 5 — Record rejections

Skipped under `--auto`.

<!-- [INTERACTIVE] AskUserQuestion: rejection justification -->

For each rejected item:

1. Collect the developer's justification as free text.
2. Refine it into a structured ADR — Context / Decision / Consequences — using the rules in `reference.md` §2.
3. Append it to the `## Rejected` section of `justifications.md`.

There is no separate debt ledger in 1.0. `justifications.md` is the record, and `revalidate` reads it to judge whether each rejection holds.

## Step 6 — Write `justifications.md`

Write `REVIEW_DIR/justifications.md` from the template in `reference.md` §1, with frontmatter `resolve_commit_sha: <base_sha>` — the Step 4 value, **not** current `HEAD`. After the Step 7 commit `HEAD` moves, and the delta must contain only the correction changes.

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

| Option       | Type   | Default | Effect                                     |
| ------------ | ------ | ------- | ------------------------------------------ |
| `--auto`     | flag   | off     | Accept every item, skip prompts and Step 5 |
| `--base REF` | string | auto    | Base ref passed through to `review_state`  |

## Invariants

- No code is authored here. Accepted items are delegated; rejected items are recorded.
- `resolve_commit_sha` is captured before any correction lands.
- An accepted item that produced no change is reported, never hidden.
- Review artifacts are never committed.
- No debt record is created. `justifications.md` is the single rejection record.
