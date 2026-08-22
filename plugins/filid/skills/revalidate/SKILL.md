---
name: revalidate
user-invocable: true
description: '[filid:revalidate] Re-measure the post-correction delta against the recorded resolve baseline, judge every rejection justification, and issue the final PASS or FAIL.'
argument-hint: '[--base REF]'
version: '1.0.0'
complexity: complex
plugin: filid
---

# revalidate — Delta Re-measurement and Final Verdict

Run this skill as one continuous operation. Do not ask whether to continue between steps. Yield only for an unrecoverable state error or after the terminal verdict.

This is the only stage that decides whether the review cycle closed. It re-measures rather than trusting `resolve` — an accepted item is resolved when the evidence moved, not when someone said it was applied.

## References

Resolve files relative to this `SKILL.md`:

- `reference.md` — status derivation matrix, `re-validate.md` template, constitutionality rules for rejections, PR comment format (§4).

## Step 1 — Locate the state and baseline

```text
mcp__plugin_filid_tools__review_state({
  action: "checkpoint",
  projectRoot: PROJECT_ROOT,
  branchName: BRANCH,
  baseRef: BASE_REF
})
```

Use `data.reviewDirectory` as `REVIEW_DIR`; never derive a directory name. `missing` aborts. `stale` is expected here — corrections moved the source — and is not an error at this stage.

Read `REVIEW_DIR/justifications.md`. Its absence means `resolve` never ran; report that and end. Take `resolve_commit_sha` from the frontmatter.

## Step 2 — Extract the delta

```text
git diff --name-only <resolve_commit_sha>..HEAD
```

An empty delta with accepted items present is a finding, not a pass: it means nothing was applied. Record every accepted item as `unapplied` and continue to Step 4 so the rejections are still judged.

## Step 3 — Re-measure the accepted items

For each accepted item, re-run the measurement that produced the original finding, scoped to the item's owning fractal:

| Perspective    | Re-measurement                                                                  |
| -------------- | ------------------------------------------------------------------------------- |
| `contract`     | `structure_validate` with `scopes: ["documents"]`                               |
| `structure`    | `structure_validate` with `scopes: ["nodes","entry-points","boundaries","dag"]` |
| `verification` | `verification_scan`, plus `structure_validate` `scopes: ["verification"]`       |

```text
mcp__plugin_filid_tools__structure_validate({
  path: <current eligible fractal path — never PROJECT_ROOT>,
  mode: "project",
  scopes: [...]
})
```

Resolve the item first and read `context_resolve.summary.ownerFractalPath` plus the durable `context_resolve.summary.chainPaths`. Start at the owner. When the relevant rule is uncertain only because required evidence lies outside that scan root, retry the remaining owner-to-root ancestors in order. The detailed selection and finding-identity rules are in `reference.md` §1.

Read the findings from the returned result or, when the payload exceeds the inline envelope budget, from its artifact. Reading an absent inline `data` as "the finding is gone" is how this step produces a false `resolved`.

Normalize the accepted item's project-relative path and preserve its original `(Rule, Path)` identity at every scope. An exact matching violation stops the search and remains `unresolved` or `unapplied`; do not widen it away. Only `indeterminate` or `unsupported` evidence for that rule permits the next ancestor. The first exact result stops the search, and exact absence resolves the item. Never pass `PROJECT_ROOT`; exhausted uncertain scopes stay `inconclusive`.

Derive each item's status from the matrix in `reference.md` §1. A status is derived from measured evidence only. Never mark an item resolved because the file appears in the delta.

`indeterminate` evidence never becomes a pass. An item whose rule could not be measured exactly is `inconclusive`.

## Step 4 — Judge the rejections

For each entry in the `## Rejected` section of `justifications.md`, apply the constitutionality rules in `reference.md` §2:

- Context is a condition, not a preference;
- Decision states what is done instead;
- Consequences state what the project now accepts.

A rejection that fails any of the three is `unconstitutional` and counts as an open finding. Timing, age, and intent-to-fix are not rationales.

## Step 5 — Derive the verdict

| Condition                                                         | Verdict        |
| ----------------------------------------------------------------- | -------------- |
| Any accepted item `unresolved` or `unapplied`                     | `FAIL`         |
| Any rejection `unconstitutional`                                  | `FAIL`         |
| Any item `inconclusive` and no failure above                      | `INCONCLUSIVE` |
| Every accepted item `resolved` and every rejection constitutional | `PASS`         |

## Step 6 — Write the report

Write `REVIEW_DIR/re-validate.md` from the template in `reference.md` §3.

Immediately continue to Step 7. Cleanup is Step 8 and runs last, because releasing the state deletes this file and Step 7 still needs it.

## Step 7 — Publish the Verdict to the Pull Request

Determine whether the current branch has a pull request, through whatever pull-request access the host provides. No tool is named here on purpose: this step states the requirement, and the executing agent uses whatever access it has.

| Situation                          | Action                                                   |
| ---------------------------------- | -------------------------------------------------------- |
| The branch has a pull request      | Post the comment from `reference.md` §4 — one per branch |
| The branch has no pull request     | Skip; record `pr-comment: none` in the terminal output   |
| Pull-request access is unavailable | Skip; record `pr-comment: unavailable`                   |
| Posting fails                      | Skip; record `pr-comment: failed` with the reason        |

Compose the comment from the `re-validate.md` Step 6 just wrote. A missing, unavailable, or failed comment never changes the verdict and never fails the run.

## Step 8 — Release the state on PASS

On `PASS` only:

```text
mcp__plugin_filid_tools__review_state({
  action: "cleanup",
  projectRoot: PROJECT_ROOT,
  branchName: BRANCH,
  confirm: true
})
```

`confirm` must be the literal `true`. On `FAIL` or `INCONCLUSIVE` the directory is kept — the next `resolve` run needs it.

## Terminal Output

```text
Revalidate: <PASS|FAIL|INCONCLUSIVE> (resolved <r>, unresolved <u>, unapplied <k>, inconclusive <i>, unconstitutional <c>)
PR comment: <posted|updated|none|unavailable|failed>
```

## Options

| Option       | Type   | Default | Effect                                    |
| ------------ | ------ | ------- | ----------------------------------------- |
| `--base REF` | string | auto    | Base ref passed through to `review_state` |

## Invariants

- Status comes from re-measurement, never from the delta's file list alone.
- `indeterminate` evidence never yields `PASS`.
- The baseline is `resolve_commit_sha` from `justifications.md`, never `HEAD~1` and never the review base.
- Cleanup happens only on `PASS`, only with literal `confirm: true`, and only after the pull-request comment step has run.
- This skill never edits source, never commits, and never pushes. The only pull-request action is posting or updating its own verdict comment.
- A branch without a pull request is a normal outcome, not a failure.
