# resolve — Reference

## §1 `justifications.md` template

Written to `REVIEW_DIR/justifications.md`. This file is the sole record of what was accepted and why anything was declined. It is never committed.

```markdown
---
branch: <branch>
base_ref: <base ref>
resolve_commit_sha: <SHA captured before any correction landed>
accepted: <n>
rejected: <m>
unapplied: <k>
---

# FCA Resolve — <branch>

## Accepted

### FIX-001: <rule at path>

- **Path**: `<project-relative path>`
- **Rule**: <FCA rule or DETAIL requirement>
- **Delegated to**: main-agent | filid:restructure | <plugin:skill>
- **Applied**: yes | no
- **Change**: <one line naming what moved or changed, or `none observed`>

## Rejected

### FIX-002: <rule at path>

- **Path**: `<project-relative path>`
- **Rule**: <FCA rule or DETAIL requirement>
- **Context**: <the situation that makes the finding contentious>
- **Decision**: <what was decided instead, stated as a choice>
- **Consequences**: <what this costs and what now has to stay true>
```

`resolve_commit_sha` is load-bearing. `revalidate` diffs `resolve_commit_sha..HEAD`; a value read after the commit yields an empty delta and a false PASS.

## §2 ADR refinement rules

A raw justification becomes an ADR only when all three parts are present.

- **Context** — the concrete condition, not a preference. "This organ is imported by two fractals in different subtrees" qualifies; "this feels fine" does not.
- **Decision** — what is being done _instead of_ the recommended action. A decision that restates the finding is not a decision.
- **Consequences** — what the project now accepts. This is the part `revalidate` judges: a rejection with no stated cost is unconstitutional.

Reject-the-rejection cases, reported back to the developer for a second pass:

| Symptom                                   | Why it fails                |
| ----------------------------------------- | --------------------------- |
| "Out of scope for this PR"                | Timing is not a rationale   |
| "Pre-existing"                            | Age is not a rationale      |
| "Will fix later"                          | No decision, no consequence |
| Consequences section restates the Context | Nothing was accepted        |

## §3 Delegation brief format

One brief per accepted item routed to the **main agent**. Hand it out verbatim; the executor never reads `fix-requests.md` itself.

```text
Apply FIX-NNN.
Path:     <absolute path>
Rule:     <FCA rule or DETAIL requirement>
Problem:  <Consequence line from the fix request>
Required: <Recommended Action line from the fix request>
Bounds:   Change only what the required action names. Do not reformat
          neighbouring code, do not rename unrelated symbols, do not edit
          INTENT.md or DETAIL.md.
```

Routing:

| Item shape                                    | Executor             |
| --------------------------------------------- | -------------------- |
| In-file correction (import, export, contract) | main agent           |
| File or directory placement                   | `/filid:restructure` |
| Document content                              | `/filid:enrich-docs` |

A `structure` perspective item that names a target path is a placement item. Route it rather than editing paths by hand — `restructure` is the only thing that verifies the postconditions.

The two skill rows never receive the brief above — its Bounds clause forbids exactly what those skills exist to do. Each takes its own documented input:

| Route                | Receives                                                                                                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/filid:restructure` | a placement request — the item's source path, plus any target, consumers, or intent the fix request names                                                             |
| `/filid:enrich-docs` | the owning fractal path only. It has no parameter for a per-item action and re-derives its edit plan from snapshot evidence — the same call shape `pull-request` uses |

Turning a free-text Recommended Action into `restructure`'s placement-request shape is a judgment call for the invoking agent; state the mapping you chose in the terminal output.

## §4 Severity gate

| Severity  | Behaviour                                                     |
| --------- | ------------------------------------------------------------- |
| `error`   | Must be decided. Skipping is not an option.                   |
| `warning` | May be deferred; a deferral is still recorded as a rejection. |

Under `--auto` every item is accepted regardless of severity, and no rejection section is written.

## §5 What this skill does not do

- It does not author corrections. It states the requirement and delegates.
- It does not create debt records; 1.0 has no debt ledger.
- It does not push. `pipeline` pushes between `resolve` and `revalidate`.
- It does not re-run the review. `revalidate` re-measures.
