# revalidate — Reference

## §1 Status derivation matrix

One status per accepted item, derived from re-measurement only.

| Original finding present? | Item path in delta? | Evidence certainty | Status         |
| ------------------------- | ------------------- | ------------------ | -------------- |
| gone                      | yes                 | `exact`            | `resolved`     |
| gone                      | no                  | `exact`            | `resolved`\*   |
| still present             | yes                 | `exact`            | `unresolved`   |
| still present             | no                  | `exact`            | `unapplied`    |
| any                       | any                 | `indeterminate`    | `inconclusive` |
| any                       | any                 | `unsupported`      | `inconclusive` |

\* A finding can disappear because a sibling correction removed its cause. That is a genuine resolution; record the observed cause in the report line.

Never invert this table. "The file changed, so it must be fixed" is the failure mode the matrix exists to block.

### Re-measurement scope

Resolve every accepted item's full owner-to-root fractal chain in one call:

```text
mcp__plugin_filid_tools__context_resolve({
  path: PROJECT_ROOT,
  requests: [
    { targetPath: <accepted item path 1> },
    { targetPath: <accepted item path 2> }
  ]
})
```

Read `data.results`, or the artifact's results when inline `data` is absent, and map each accepted item to the result at the same index. A failed result is `inconclusive` with its diagnostic. Use each resolved `result.summary.ownerFractalPath` as the first scope. Remove that duplicate from `result.summary.chainPaths`, then use the remaining paths as the ordered ancestor retry list.

Before measuring, normalize the accepted item's project-relative `Path` against `PROJECT_ROOT`. At every scope compare violations by the original normalized `(Rule, Path)` identity — `ruleId` plus absolute violation `path` — never by aggregate counts.

Apply this precedence at each scope:

1. Any exact matching violation stops widening. The item is `unresolved` when its path is in the delta and `unapplied` otherwise.
2. When no exact match exists but the relevant rule is `indeterminate` or `unsupported` because required evidence lies outside the scan root, retry the next `result.summary.chainPaths` ancestor.
3. The first exact measurement stops widening. Absence of the matching violation is `resolved`.
4. If all eligible fractal scopes remain uncertain, the item is `inconclusive`.

Never pass `PROJECT_ROOT`, never widen an exact surviving finding, and never credit one item with another item's improvement. Widening is an evidence-completion fallback, not a search for a green aggregate count.

## §2 Constitutionality rules for rejections

A rejection holds only when all three parts stand on their own.

| Part         | Holds when                                             | Fails when                       |
| ------------ | ------------------------------------------------------ | -------------------------------- |
| Context      | States a condition that is checkable                   | States a preference or a feeling |
| Decision     | Names what is done _instead of_ the recommended action | Restates the finding             |
| Consequences | Names what the project now accepts and must keep true  | Empty, or repeats the Context    |

Rejected rationales, verbatim:

- "Out of scope for this PR" — timing is not a rationale.
- "Pre-existing" — age is not a rationale.
- "Will fix later" — no decision and no consequence.
- "Team convention" — name the convention and where it is written, or it is a preference.

An `unconstitutional` rejection is an open finding. It does not become acceptable by being repeated in a later cycle.

## §3 `re-validate.md` template

```markdown
---
branch: <branch>
base_ref: <base ref>
resolve_commit_sha: <baseline from justifications.md>
head_sha: <current HEAD>
verdict: PASS | FAIL | INCONCLUSIVE
---

# FCA Revalidate — <branch>

## Delta

<files changed between resolve_commit_sha and HEAD, or `none`>

## Accepted Items

| ID      | Path | Rule | Status   | Evidence                                    |
| ------- | ---- | ---- | -------- | ------------------------------------------- |
| FIX-001 | ...  | ...  | resolved | <tool + scope that showed the finding gone> |

## Rejections

| ID      | Rule | Judgement        | Reason                                |
| ------- | ---- | ---------------- | ------------------------------------- |
| FIX-002 | ...  | constitutional   | —                                     |
| FIX-003 | ...  | unconstitutional | Consequences section restates Context |

## Verdict

<PASS | FAIL | INCONCLUSIVE>

<One paragraph: what closed, what is open, and what the next action is.>
```

## §4 PR comment format

Posted only when the branch has a pull request. The verdict table stays **outside** the collapsible section so the result reads without expanding anything.

```markdown
## Re-validation — <✅ PASS | ❌ FAIL | ⚠️ INCONCLUSIVE>

| Field    | Value                                                            |
| -------- | ---------------------------------------------------------------- |
| Verdict  | <PASS \| FAIL \| INCONCLUSIVE>                                   |
| Branch   | `<branch>`                                                       |
| Baseline | `<resolve_commit_sha>` → `<head_sha>`                            |
| Accepted | <r> resolved · <u> unresolved · <k> unapplied · <i> inconclusive |
| Rejected | <n> constitutional · <c> unconstitutional                        |

<details><summary>Accepted items (<n>)</summary>

<the Accepted Items table from re-validate.md>

</details>

<details><summary>Rejections</summary>

<the Rejections table and its per-part judgement>

</details>

> Full report: `<REVIEW_DIR>/re-validate.md`
```

Rules:

- Strip the raw frontmatter from any body copied into a `<details>` block — the table above already carries those fields.
- Keep the comment within the host's comment size limit. When it would exceed, keep the table, replace the folded blocks with the report pointer, and say that the rest was truncated.
- A comment carrying the `## Re-validation` heading is this skill's own. Update it in place rather than adding a second one, so repeated cycles leave one comment per branch.
- On `PASS` the review directory is deleted in Step 8, so the report pointer names a path that no longer exists. Keep it anyway — it tells a reader where the record lived, and the comment itself carries the verdict.

## §5 Failure handling

| Situation                                    | Action                                                       |
| -------------------------------------------- | ------------------------------------------------------------ |
| `justifications.md` missing                  | Report that `resolve` has not run; end without a verdict.    |
| `resolve_commit_sha` missing or unresolvable | Abort. The baseline cannot be reconstructed after the fact.  |
| Empty delta with accepted items              | Every accepted item is `unapplied`; verdict `FAIL`.          |
| `review_state` disposition `missing`         | Abort. The review directory was removed before revalidation. |

## §6 What this skill does not do

- It does not edit source, commit, or push.
- It does not re-run `cross-review`. A new review is a new cycle.
- It does not resolve debt records; 1.0 has no debt ledger.
- It does not post a PR comment when the branch has no pull request, and it does not open one.
