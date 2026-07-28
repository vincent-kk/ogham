# cross-review — FCA Review Contracts

This document is the source of truth for cross-review artifacts, findings, arbitration, verdicts, and review-state handling.

## Review Scope

Cross-review judges only FCA evidence that intersects files changed between the selected base and `HEAD`:

- contract evidence from INTENT.md, DETAIL.md, and public entry points;
- structure evidence from node classification, entry points, external boundaries, and the dependency DAG;
- verification evidence from spec-document and test-record policy.

General code quality, product behavior, security, style, and performance are outside this skill. A concern without an FCA rule or contract anchor is omitted. Existing findings outside changed files and their owning fractals are recorded as out of scope and cannot affect the verdict.

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
gaps:
  - <missing evidence; empty when complete>
---
```

Rules:

- Findings must intersect changed files or their owning fractals.
- `severity` preserves the canonical rule severity; reviewers do not promote or demote it.
- `state: COMPLETE` with `findings: []` is valid and must list what was checked.
- Unsupported or undecidable required evidence produces `state: INDETERMINATE` and a concrete `gaps` entry.
- A reviewer that fails twice receives a mechanical placeholder with `state: INDETERMINATE`, no findings, and `gaps: ["reviewer unavailable"]`; the orchestrator never fabricates a completed opinion.
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
- The arbiter cannot create a new candidate. A newly noticed concern is returned as a gap and makes the run `INCONCLUSIVE`.

## Verdict Derivation

Apply in order:

| Condition                                                                                                 | Verdict           |
| --------------------------------------------------------------------------------------------------------- | ----------------- |
| source state is stale, evidence hashes differ, or a required reviewer artifact is missing after one retry | `INCONCLUSIVE`    |
| any perspective or arbitration decision is `INDETERMINATE` for changed scope                              | `INCONCLUSIVE`    |
| one or more candidates are `CONFIRMED`                                                                    | `REQUEST_CHANGES` |
| every candidate is `REFUTED`, or no perspective raised a candidate                                        | `APPROVED`        |

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
