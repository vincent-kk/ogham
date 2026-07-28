---
name: cross-review
user_invocable: true
description: '[filid:cross-review] Review a committed change from independent FCA contract, structure, and verification perspectives, then adversarially arbitrate every finding.'
argument-hint: '[--base REF] [--force] [--cleanup]'
version: '4.0.0'
complexity: complex
plugin: filid
---

# cross-review — FCA Evidence Review

Run this skill as one continuous operation. Intermediate evidence and reviewer
files are internal artifacts; do not ask whether to continue between phases.
Yield only for an unrecoverable source-state error or after a sealed terminal
verdict.

## References

Resolve files relative to this `SKILL.md`:

- `specification.md` — the public contract specification: requirements the run
  must satisfy and the review-report frontmatter contract;
- `contracts.md` — scope, state lifecycle, evidence, opinions, arbitration,
  verdict derivation;
- `phases/evidence.md` — exact snapshot-backed MCP calls and evidence layouts;
- `reviewers/contract.md`, `reviewers/structure.md`,
  `reviewers/verification.md` — independent perspectives;
- `reviewers/adversarial.md` — candidate arbitration;
- `templates.md` — canonical artifacts;
- `reference.md` — index of the files above and the tool-purpose table;
- `calibration/` — reviewer regression fixtures.

Read `specification.md`, `contracts.md`, and `templates.md` before starting.

## Scope

Cross-review judges FCA evidence only:

- INTENT.md, DETAIL.md, and public contract alignment;
- node classification, entry points, external boundaries, and dependency DAG;
- lowest-common-fractal placement and approved restructure-plan postconditions;
- spec-document and test-record policy, including counting certainty.

Do not report general code quality, product behavior, security, style,
performance, or unrelated pre-existing findings.

The verdict is explicitly FCA-scoped: it certifies the FCA contract and
structure of the change, not its correctness, security, or product fit.

## Step 1 — Resolve Source and Prepare State

1. Resolve absolute `PROJECT_ROOT` from the current project.
2. Read the current branch name. A detached or empty branch name is an
   unrecoverable input error.
3. Resolve `BASE_REF` from `--base`; otherwise use the configured remote default,
   then `origin/main`, then `origin/master`. Verify the ref before continuing.
4. Collect committed scope with:

   ```bash
   git diff --name-status BASE_REF..HEAD
   ```

5. Check working-tree status. Existing `.filid/review/` artifacts are allowed;
   any other uncommitted path makes the run `INCONCLUSIVE` because MCP snapshots
   would not describe the committed state.

When `--cleanup` is present, call:

```text
mcp__plugin_filid_tools__review_state({
  action: "cleanup",
  projectRoot: PROJECT_ROOT,
  branchName: BRANCH,
  confirm: true
})
```

Report the `cleaned` disposition and stop. Cleanup never runs implicitly.

Otherwise call:

```text
mcp__plugin_filid_tools__review_state({
  action: "prepare",
  projectRoot: PROJECT_ROOT,
  branchName: BRANCH,
  baseRef: BASE_REF,
  force: <true only with --force>
})
```

Use `data.reviewDirectory` as `REVIEW_DIR`; never derive a directory name.
Record `data.state.sourceHash` as `SOURCE_HASH`.

- `fresh` — start at Step 2.
- `resumable` — call `checkpoint`, inspect canonical files, and resume at the
  first incomplete phase.
- `cached` — read `data.reportPath`, emit its sealed verdict, and stop.
- non-`ok` status — report diagnostics and stop.

For a fresh run, write `REVIEW_DIR/session.md` from `templates.md`, including
every changed file and its owning fractal when known.

## Step 2 — Collect Snapshot Evidence

Follow `phases/evidence.md`. Run:

1. `fractal_scan` with `detail: "full"`;
2. `structure_validate` with `mode: "project"` and all six FCA scopes;
3. `verification_scan` with `detail: "files"`.

Write `REVIEW_DIR/verification.md` and
`REVIEW_DIR/structure-check.md`. Copy changed-scope evidence out of any
ephemeral artifact before proceeding.

All three summaries must carry the same snapshot hash. Retry the complete phase
once when hashes differ or a required artifact cannot be read. After the retry,
preserve unresolved evidence as `indeterminate` or `unsupported`; never turn it
into an empty pass.

Optional: use `context_resolve` for a changed target only when snapshot evidence
cannot identify its contract owner. Record the returned chain in
`verification.md`.

Immediately continue to Step 3.

## Step 3 — Run Three Independent Perspectives

Spawn exactly three independent foreground reviewers in parallel, using the
host's generic subagent facility. Filid ships no agents of its own — never name
a `filid:*` agent here, since a stale install may still advertise pre-1.0 ones
whose roles do not match these perspectives. Each reviewer receives:

- its matching file under `reviewers/`;
- absolute `PROJECT_ROOT` and `REVIEW_DIR`;
- `BASE_REF`, `SOURCE_HASH`, and the shared snapshot hash;
- `session.md`, `verification.md`, and `structure-check.md`;
- permission to read the committed diff and cited changed files;
- permission to write only its own opinion path.

Output paths:

| Reviewer     | Output                                |
| ------------ | ------------------------------------- |
| contract     | `REVIEW_DIR/opinions/contract.md`     |
| structure    | `REVIEW_DIR/opinions/structure.md`    |
| verification | `REVIEW_DIR/opinions/verification.md` |

The first reviewer action writes a parseable `INDETERMINATE` skeleton. The last
action rewrites it with the final state. Reviewers do not call other reviewers
and do not rerun project-wide evidence tools.

Retry a missing or malformed opinion once with a fresh reviewer. After a second
failure, write only the mechanical unavailable placeholder defined in
`contracts.md`; this forces `INCONCLUSIVE`.

Immediately continue to Step 4 after all three files exist.

## Step 4 — Adversarial Arbitration

Spawn one fresh foreground reviewer — same generic subagent facility as Step 3 —
using `reviewers/adversarial.md`. Give it the
three opinions, canonical evidence files, committed diff, `SOURCE_HASH`, and
shared snapshot hash. It writes only:

```text
REVIEW_DIR/opinions/adversarial.md
```

The arbiter deduplicates by `path + rule` and returns exactly one
`CONFIRMED`, `REFUTED`, or `INDETERMINATE` decision for every candidate. It
cannot create findings or replace adapter facts with intuition. Run arbitration
even when no candidate exists; the completed empty decision set proves all three
opinions were inspected.

Retry a missing or malformed arbitration file once. A second failure produces
an `INDETERMINATE` arbitration placeholder and therefore an `INCONCLUSIVE`
verdict.

## Step 5 — Checkpoint, Report, and Seal

Before deriving the report, call:

```text
mcp__plugin_filid_tools__review_state({
  action: "checkpoint",
  projectRoot: PROJECT_ROOT,
  branchName: BRANCH,
  baseRef: BASE_REF
})
```

If disposition is `stale` or `missing`, discard the unsealed artifacts by
calling `prepare` once with `force: true`, then restart at Step 2. If identity
changes again, stop without a terminal verdict.

Derive the verdict exactly from `contracts.md`:

- required evidence or a reviewer decision is unresolved → `INCONCLUSIVE`;
- at least one confirmed FCA finding → `REQUEST_CHANGES`;
- all candidates refuted, or no candidates → `APPROVED`.

Write `review-report.md` using `templates.md`. For `REQUEST_CHANGES`, also write
`fix-requests.md` containing confirmed FCA findings only. For the other verdicts,
remove any stale `fix-requests.md` inside this exact `REVIEW_DIR`.

Seal only after the report exists:

```text
mcp__plugin_filid_tools__review_state({
  action: "seal",
  projectRoot: PROJECT_ROOT,
  branchName: BRANCH,
  baseRef: BASE_REF
})
```

The run is complete only when status is `ok` and disposition is `sealed`. Then
emit exactly:

```text
Review verdict: <APPROVED|REQUEST_CHANGES|INCONCLUSIVE>
```

## Options

| Option       | Default | Meaning                                                                          |
| ------------ | ------- | -------------------------------------------------------------------------------- |
| `--base REF` | auto    | committed comparison base                                                        |
| `--force`    | off     | prepare a fresh state and clear stale canonical review artifacts for this branch |
| `--cleanup`  | off     | explicitly delete only this branch's review directory, then stop                 |

## Invariants

- Exactly three FCA perspectives plus one adversarial arbitration.
- One snapshot identity across scan, structure, and verification evidence.
- No project source edits, file moves, import rewrites, commits, pushes, or PR
  operations.
- No terminal verdict before a successful review-state seal.
- Output language follows `[filid:lang]`; paths, identifiers, and rule IDs remain
  unchanged.
