# cross-review — Output Templates

## `session.md`

```markdown
---
branch: <branch>
base_ref: <base ref>
source_hash: <prepared source hash>
review_directory: <absolute path returned by review_state>
changed_files_count: <n>
created_at: <ISO 8601>
---

## Changed Files

| Path | Change | Owning Fractal |
| ---- | ------ | -------------- |
```

## Evidence Artifacts

Use the exact layouts in `phases/evidence.md` for `verification.md` and
`structure-check.md`. Both files must carry matching source and snapshot hashes.

## Perspective Opinions

`opinions/contract.md`, `opinions/structure.md`, and
`opinions/verification.md` use the Opinion Contract in `contracts.md`.
`opinions/adversarial.md` uses the Arbitration Contract.

## `review-report.md`

```markdown
---
verdict: APPROVED | REQUEST_CHANGES | INCONCLUSIVE
branch: <branch>
base_ref: <base ref>
source_hash: <prepared source hash>
snapshot_hash: <shared snapshot hash or unavailable>
perspectives: [contract, structure, verification]
generated_at: <ISO 8601>
---

# FCA Cross-Review — <branch>

## Scope

<changed files and owning fractals>

## Evidence Status

| Evidence     | Status   | Hash   | Diagnostics |
| ------------ | -------- | ------ | ----------- |
| Snapshot     | <status> | <hash> | <summary>   |
| Structure    | <status> | <hash> | <summary>   |
| Verification | <status> | <hash> | <summary>   |

## Perspective Results

| Perspective | State | Findings | Checked | Gaps |
| ----------- | ----- | -------- | ------- | ---- |

## Arbitration Log

| Candidate | Verdict | Evidence | Reason |
| --------- | ------- | -------- | ------ |

## Confirmed FCA Findings

| ID  | Severity | Path | Rule | Consequence | Action |
| --- | -------- | ---- | ---- | ----------- | ------ |

## Refuted Candidates

| ID  | Refuting Evidence | Reason |
| --- | ----------------- | ------ |

## Final Verdict

**<VERDICT>** — <one sentence derived from contracts.md>.
```

For `INCONCLUSIVE`, keep every section, name the missing or inconsistent
evidence, and do not present unresolved rows as findings.

## `fix-requests.md`

Write this file only when the verdict is `REQUEST_CHANGES`. It contains confirmed
FCA findings only:

```markdown
# FCA Fix Requests — <branch>

## FIX-001: <rule at path>

- **Severity**: error | warning
- **Perspective**: contract | structure | verification
- **Path**: `<project-relative path>`
- **Rule**: <FCA rule or DETAIL requirement>
- **Evidence**: <canonical artifact section or file:line>
- **Consequence**: <specific broken contract or boundary>
- **Recommended Action**: <bounded correction>
```

Cross-review never edits project files and never embeds an automatic patch.

## Terminal Output

After a successful seal, emit exactly:

```text
Review verdict: APPROVED
```

or the corresponding `REQUEST_CHANGES` / `INCONCLUSIVE` value. Before seal, no
terminal verdict marker is valid.
