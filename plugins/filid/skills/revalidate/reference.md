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

Scope each call to the item's owning fractal, resolved through:

```text
mcp__plugin_filid_tools__context_resolve({
  path: PROJECT_ROOT,
  targetPath: <item path>
})
```

Comparing a whole-project count before and after is not a per-item measurement — two items in the same run would each claim the other's improvement.

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

## §4 Failure handling

| Situation                                    | Action                                                       |
| -------------------------------------------- | ------------------------------------------------------------ |
| `justifications.md` missing                  | Report that `resolve` has not run; end without a verdict.    |
| `resolve_commit_sha` missing or unresolvable | Abort. The baseline cannot be reconstructed after the fact.  |
| Empty delta with accepted items              | Every accepted item is `unapplied`; verdict `FAIL`.          |
| `review_state` disposition `missing`         | Abort. The review directory was removed before revalidation. |

## §5 What this skill does not do

- It does not edit source, commit, or push.
- It does not re-run `cross-review`. A new review is a new cycle.
- It does not resolve debt records; 1.0 has no debt ledger.
- It does not post a PR comment unless `--comment` is passed.
