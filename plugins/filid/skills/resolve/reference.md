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

## §3 Recommendation rubric

Recommendation describes whether the correction should flow through by default. Severity and Perspective describe the finding; neither decides the recommendation alone. An error can require discussion, and a warning can be an obvious default apply.

| Signal                       | Recommendation | Default | Presentation        |
| ---------------------------- | -------------- | ------- | ------------------- |
| Clear-cut or low-impact      | Apply          | `[x]`   | Selected by default |
| Material choice or trade-off | Discuss        | `[?]`   | Needs attention     |

Use **Apply** when the confirmed evidence leads to one bounded correction without a material product, public API, architecture, data-loss, or rollout choice. Also use it for a local, reversible warning whose correction has no meaningful behaviour trade-off. These are the clear-cut and minor items that should not consume the developer's attention.

Use **Discuss** only when applying the Recommended Action requires a material choice the evidence cannot settle: competing valid boundary or placement shapes, a public contract change, conflict with explicit project direction, or a substantial scope/risk trade-off. State that choice in the recommendation reason; do not use vague importance labels.

`--auto` does not erase this classification. The sheet retains Recommendation and its reason while the final Decision is auto-selected for every item.

## §4 Decision sheet and batch input

Render the whole set before asking anything. Keep FIX order within each group, but put the Discuss group first so consequential choices are not buried under routine corrections.

```text
Total: <n> | Errors: <n> | Warnings: <n> | Apply: <n> | Discuss: <n>

### Needs attention
| Default | ID | Severity | Perspective | Recommendation | Path |
| ------- | -- | -------- | ----------- | -------------- | ---- |
| `[?]` | FIX-NNN | error | structure | Discuss | `<path>` |

### Selected by default
| Default | ID | Severity | Perspective | Recommendation | Path |
| ------- | -- | -------- | ----------- | -------------- | ---- |
| `[x]` | FIX-NNN | warning | contract | Apply | `<path>` |

FIX-NNN: <title>
Consequence: <specific broken contract or boundary>
Recommended Action: <bounded correction>
Recommendation reason: <one sentence>
```

Show every FIX once in the summary and once in the details. A missing group is printed as `None`; never hide the fact that its count is zero.

The interactive question has two fixed options: **Apply recommended set** and **Apply every item**. The host adds **Other** automatically; use it for any number of overrides or discussion requests:

```text
apply FIX-001,FIX-004; discuss FIX-002: <question>; skip FIX-003: <reason>; reject FIX-005: <reason>
```

Omitted IDs keep their displayed defaults. The directives mean:

| Directive | Result                                                            |
| --------- | ----------------------------------------------------------------- |
| `apply`   | Accept the named items.                                           |
| `discuss` | Answer all named questions together; the items remain unresolved. |
| `skip`    | Defer a warning with a reason and record it as a rejection.       |
| `reject`  | Decline the correction with a reason for ADR refinement.          |

Reject a directive batch when it contains an unknown or duplicate ID, tries to skip an error, or omits a skip/reject reason. Report every invalid directive together. After answering all discussion questions in one response, show only the unresolved rows and accept the next batch; never split them into one prompt per FIX.

Before the batch closes, refine every skip/reject reason with §2 and require complete Context, Decision, and Consequences fields. Report all incomplete ADRs together and leave those items unresolved. The decision set becomes final only after every ADR passes; baseline capture and delegation happen afterward, and the rejection step only serializes the stored fields.

## §5 Delegation brief format

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

## §6 Severity gate

| Severity  | Behaviour                                                     |
| --------- | ------------------------------------------------------------- |
| `error`   | Must be decided. Skipping is not an option.                   |
| `warning` | May be deferred; a deferral is still recorded as a rejection. |

Under `--auto` every item is accepted regardless of severity, and no rejection section is written.

## §7 What this skill does not do

- It does not author corrections. It states the requirement and delegates.
- It does not create debt records; 1.0 has no debt ledger.
- It does not push. `pipeline` pushes between `resolve` and `revalidate`.
- It does not re-run the review. `revalidate` re-measures.
