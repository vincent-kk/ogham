# cross-review — Actor Contracts

## Reviewer opinion JSON

For round 1, write the path named by the review brief's `output` field. For round 2 or later, use the orchestrator-supplied output path with the same schema:

```json
{
  "schema": 7,
  "group": "01",
  "round": 1,
  "state": "COMPLETE",
  "sourceHash": "<state.sourceHash>",
  "files": [
    {
      "path": "src/a.ts",
      "change": "M",
      "chunk": null,
      "result": "reviewed",
      "reason": null
    }
  ],
  "findings": [
    {
      "id": "R01-001",
      "severity": "error",
      "category": "bug",
      "path": "src/a.ts",
      "existingCode": "if (items.length = 0) {",
      "lines": "unknown",
      "rule": "DEF-1",
      "message": "<falsifiable defect statement>",
      "evidence": "src/a.ts:42",
      "consequence": "<what fails>",
      "recommendedAction": "<bounded correction>"
    }
  ],
  "checked": ["src/a.ts", "FCA-001"],
  "gaps": [
    {
      "path": "src/b.ts",
      "rule": "DEF-4",
      "detail": "<evidence that could not be obtained>"
    }
  ],
  "riskPlan": null
}
```

`chunk` is "k/n" or null. Include assigned units exactly once; validate resolves lines from existingCode. Categories remain bug, security, performance, maintainability, test, documentation, contract, structure, verification. COMPLETE needs nonempty checked and every `checked` entry must be nonblank. `riskPlan` is nonblank for plan_required or risk_reasons. INDETERMINATE needs a gap and permits empty checked/null riskPlan. Each gap references a prepared evidence.md causeId or resolution {question,evidenceNeeded,nextAction,doneWhen,suggestedOwner,humanReason?,options?}. Question: 1–240 chars; evidence: 1–5 entries of 1–300; nextAction/doneWhen: 1–600; humanReason: 1–400. Human requires a reason evidence alone cannot choose and 2–5 distinct nonblank options of 1–300 chars. Agent recovery states the missing observation, why it matters, affected scope, next check and completion condition; unsupported analysis names the missing capability.

## Verifier opinion JSON

Write the path named by the verifier brief's `output` field with this schema:

```json
{
  "schema": 7,
  "group": "01",
  "state": "COMPLETE",
  "sourceHash": "<hash>",
  "decisions": [
    {
      "findingId": "R01-001",
      "verdict": "CONFIRMED",
      "evidence": "src/a.ts:42",
      "reason": "<one falsifiable sentence>"
    }
  ],
  "observations": [
    { "path": "src/a.ts", "detail": "<verdict-neutral concern>" }
  ],
  "checked": ["src/a.ts"]
}
```

Include exactly one decision for every ID in `## Decisions Required`, no unknown ID, and one of `CONFIRMED`, `REFUTED`, or `INDETERMINATE`. Observations never affect the verdict. Only an INDETERMINATE decision or opinion may add the same optional `resolution` object described for reviewer gaps; it proposes evidence and an owner but grants no authority.

## `fix-requests.md`

`review_state` seal renders it only for `REQUEST_CHANGES`, with confirmed findings numbered from `FIX-001`. The other artifacts, `review-report.md` and `pr-comment.md`, are rendered by `review_state` seal; their formats are defined in [report-formats.md](./report-formats.md):

```markdown
# Fix Requests — <branch>

## FIX-001: <rule at path>

- **Severity**: error | warning
- **Category**: bug | security | performance | maintainability | test | documentation | contract | structure | verification
- **Path**: `<project-relative path>`
- **Rule**: <USR-NNN, rule item, repository rule, or DETAIL requirement>
- **Claim**: <falsifiable defect statement>
- **Evidence**: <file:line or canonical evidence row>
- **Consequence**: <specific broken contract or boundary>
- **Recommended Action**: <bounded correction>
```

Copy `Claim` from the confirmed candidate's `message` verbatim and preserve its other fields. Cross-review never embeds a patch.

## Terminal Output

After a successful seal, emit exactly:

```text
Review verdict: INCONCLUSIVE
pr-comment: none
review-blockers: <returned path>
```

Include review-blockers whenever data.blockersPath is non-null, also for incomplete REQUEST_CHANGES. Legacy INCONCLUSIVE without a sidecar uses unavailable (legacy). Report reviewComplete, human-decision requirement and agent next action from the sealed comment. Substitute publication status for none. No terminal verdict is valid before seal.
