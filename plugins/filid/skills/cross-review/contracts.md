# cross-review — FCA Review Contracts

This document is the source of truth for cross-review artifacts, findings, arbitration, verdicts, and review-state handling.

## Review Scope

Cross-review judges only FCA evidence that intersects files changed between the selected base and `HEAD`:

- contract evidence from INTENT.md, DETAIL.md, and public entry points;
- structure evidence from node classification, entry points, external boundaries, and the dependency DAG;
- verification evidence from spec-document and test-record policy.

General code quality, product behavior, security, style, and performance are outside this skill. A concern without an FCA rule or contract anchor is omitted. Existing findings outside changed files and their owning fractals are recorded as out of scope and cannot affect the verdict.

Certainty follows the same boundary. A project-wide aggregate reported as `indeterminate` or `unsupported` is in scope only for the changed files and owning fractals that contribute to it; when every contributing source sits outside that scope, the aggregate is an out-of-scope observation. It is neither a finding nor a gap, and it does not set a perspective's `state`.

Scope is decided by where a row was sourced, not by the path it carries. A project-granularity rule is attributed to the project root, which is an ancestor of every changed file — reading that path as "in scope" would make any project-wide uncertainty reach every review. Follow the row back to the files that produced it, and judge those.

The reviewed source is committed `BASE_REF..HEAD` content. Before `prepare`, the working tree must be clean except for existing `.filid/review/` artifacts. Overlapping uncommitted source changes make the run `INCONCLUSIVE`.

## Perspective Mapping

Exactly three independent reviewers run once:

| Perspective    | Instruction file            | Primary evidence                                      |
| -------------- | --------------------------- | ----------------------------------------------------- |
| `contract`     | `reviewers/contract.md`     | changed contracts, entry surfaces, snapshot paths     |
| `structure`    | `reviewers/structure.md`    | `structure-check.md`, snapshot node and DAG evidence  |
| `verification` | `reviewers/verification.md` | verification role, case, link, and certainty evidence |

The fourth instruction, `reviewers/adversarial.md`, receives the three completed opinions. It is an arbiter, not a fourth source of findings.

## Review-State Lifecycle

Use `mcp__plugin_filid_tools__review_state` exactly as follows:

| Action       | Required input                                           | Contract                                                                                |
| ------------ | -------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `prepare`    | `projectRoot`, `branchName`, `baseRef`, optional `force` | Computes committed content identity and creates or resumes the branch review directory. |
| `checkpoint` | `projectRoot`, `branchName`, optional `baseRef`          | Recomputes identity and returns current artifact paths.                                 |
| `seal`       | `projectRoot`, `branchName`, optional `baseRef`          | Succeeds only when identity is unchanged and `review-report.md` exists.                 |
| `cleanup`    | `projectRoot`, `branchName`, literal `confirm: true`     | Deletes only the exact branch review directory.                                         |

Never derive the directory name. Read `data.reviewDirectory` from the tool response and use that absolute path for every artifact.

`prepare` dispositions:

- `fresh` — write all artifacts from the beginning;
- `resumable` — call `checkpoint`, inspect the returned artifact paths, and continue at the first incomplete phase;
- `cached` — read the existing sealed report and return its verdict;
- any non-`ok` status — stop and report the diagnostic.

`checkpoint` returning `stale` or `missing` invalidates every unsealed result. Restart once with `prepare(force: true)`. If source identity changes again, stop without sealing. `cleanup` is never an implicit restart mechanism.

Only emit a terminal verdict after `seal` returns status `ok` and disposition `sealed`.

## Evidence Identity

`fractal_scan`, `structure_validate`, and `verification_scan` each report a snapshot hash. All three hashes must match. A mismatch means source changed during evidence collection; discard the evidence and retry once.

Tool envelope status is interpreted without coercion:

| Status          | Meaning in review                                                    |
| --------------- | -------------------------------------------------------------------- |
| `ok`            | Evidence is usable and contains no reported violation for that tool. |
| `violations`    | Evidence is usable and its in-scope findings must be reviewed.       |
| `indeterminate` | Required evidence could not be decided.                              |
| `unsupported`   | The selected adapters cannot establish the required evidence.        |

That table describes the envelope — whether the call produced usable evidence. A rule outcome carried _inside_ a usable envelope is a separate thing. When an adapter measured a surface, a certainty, or a case count and reported it as `indeterminate`, it did not fail: it decided that the subject is opaque, and emitted that decision as an evidence row. `filid_fractal-boundaries §6` and `filid_verification-records §3` bar converting such an outcome into a pass — not into an unjudgeable run. A measured `indeterminate` is finding evidence. Only evidence the adapters could not obtain at all is a gap.

An artifact reference is part of the evidence. Read the artifact before spawning reviewers and copy the in-scope rows into the canonical review files; artifacts are ephemeral and must not be the sole surviving citation.

## Opinion Contract

Every `opinions/<perspective>.md` begins with:

```yaml
---
perspective: contract | structure | verification
state: COMPLETE | INDETERMINATE
source_hash: <review-state source hash>
snapshot_hash: <shared tool snapshot hash>
findings:
  - id: <CTR|STR|VER-NNN>
    severity: error | warning
    path: <project-relative path>
    rule: <FCA rule or DETAIL requirement>
    message: <falsifiable violation>
    evidence: <canonical artifact section or file:line>
    consequence: <specific FCA contract or boundary that fails>
    recommended_action: <bounded correction>
checked:
  - <path or evidence section>
gaps: # empty when complete
  - path: <project-relative path, or `-` when no path applies>
    rule: <FCA rule or evidence name the gap blocks, or `-`>
    detail: <the required evidence that could not be obtained>
---
```

`path` and `rule` are what Verdict Derivation matches on; `detail` is prose and is never matched.

Rules:

- Findings must intersect changed files or their owning fractals.
- `severity` preserves the canonical rule severity; reviewers do not promote or demote it.
- `state: COMPLETE` with `findings: []` is valid and must list what was checked.
- Required evidence the adapters could not obtain produces `state: INDETERMINATE` and a concrete `gaps` entry. Adapter-measured opacity is not that: an `indeterminate` entry surface, certainty, or case count the adapter measured and reported is a finding.
- The same `path + rule` is never recorded in both `findings` and `gaps`. One fact takes one channel.
- Evidence sourced entirely outside the changed files and their owning fractals belongs under `Out-of-scope observations` in the canonical evidence file, never in `gaps`, and does not set `state: INDETERMINATE`.
- A reviewer that fails twice receives a mechanical placeholder with `state: INDETERMINATE`, no findings, and a single gap `{path: "-", rule: "-", detail: "reviewer unavailable"}`; the orchestrator never fabricates a completed opinion.
- Narrative text cannot introduce findings absent from frontmatter.

## Arbitration Contract

The adversarial reviewer deduplicates candidates by `path + rule`, then emits one disposition per candidate:

```yaml
---
state: COMPLETE | INDETERMINATE
source_hash: <review-state source hash>
snapshot_hash: <shared tool snapshot hash>
decisions:
  - finding_id: <candidate id>
    verdict: CONFIRMED | REFUTED | INDETERMINATE
    evidence: <line or canonical evidence row>
    reason: <one falsifiable sentence>
checked: [<paths and evidence sections>]
gaps: []
---
```

- `CONFIRMED` requires the cited rule, path, and evidence to agree.
- `REFUTED` requires a contradictory line, rule scope, or adapter fact.
- `INDETERMINATE` is used when required evidence is missing; uncertainty never becomes approval.
- Snapshot-backed rows are facts. Arbitration may correct scope or attribution but must not invent replacement measurements.
- `gaps` uses the Opinion Contract entry shape. Arbitration gaps carry no coverage exception — see Verdict Derivation.
- The arbiter cannot create a new candidate. A newly noticed concern is returned as a gap and makes the run `INCONCLUSIVE`.

## Verdict Derivation

Apply in order:

| Condition                                                                                                            | Verdict           |
| -------------------------------------------------------------------------------------------------------------------- | ----------------- |
| source state is stale, evidence hashes differ, or a required reviewer artifact is missing after one retry            | `INCONCLUSIVE`    |
| arbitration is unresolved — `state: INDETERMINATE`, a non-empty `gaps`, or any decision with verdict `INDETERMINATE` | `INCONCLUSIVE`    |
| a perspective gap in changed scope is not covered                                                                    | `INCONCLUSIVE`    |
| one or more candidates are `CONFIRMED`                                                                               | `REQUEST_CHANGES` |
| every candidate is `REFUTED`, or no perspective raised a candidate                                                   | `APPROVED`        |

A perspective gap is **covered** when a `CONFIRMED` decision exists whose `rule` equals the gap's `rule` and whose path resolves to the same owning fractal as the gap's path. `rule` matches exactly; only `path` is normalized to its owning fractal, because Review Scope already makes the owning fractal the unit of scope — a gap naming an entry-point file and a finding naming the fractal that owns it are the same fact. A gap whose `rule` is `-`, or whose owner cannot be resolved from snapshot nodes, is never covered.

Coverage is a verdict-derivation step and nothing more. It does not delete the gap, change the raising perspective's `state`, or convert the gap into a finding; the report lists covered gaps as verdict-neutral so the double entry stays visible instead of disappearing. The exception is confined to perspective gaps: an arbitration gap is a concern the arbiter could not turn into a finding, so by construction no confirmed finding covers it, and the row above admits no exception.

Both `error` and `warning` are actionable FCA findings. A warning cannot be silently converted into an advisory approval.

## Prompt Rules

Every reviewer prompt:

1. names its instruction file and exact output path first;
2. supplies absolute `PROJECT_ROOT` and `REVIEW_DIR`, base ref, source hash, and snapshot hash;
3. lists the canonical evidence files it may read;
4. forbids writes outside its own opinion file;
5. requires a parseable skeleton before analysis and a final rewrite after analysis;
6. preserves the configured output language while leaving identifiers, paths, and rule IDs unchanged.

The three perspective reviewers run in parallel. Arbitration starts only after all three final opinion files exist.
