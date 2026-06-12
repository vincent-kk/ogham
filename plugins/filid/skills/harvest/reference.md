# harvest — Reference Documentation

## Criteria Ledger Template (`.filid/criteria.md`)

Created on first harvest; committed to the repository (it is the
project-level oracle, unlike the per-clone manifest). Section headings
and field keys are machine-parsed by the PreToolUse ledger lint and by
`/filid:review` Step D.0 — keep them in English.

```markdown
# Acceptance Criteria Ledger

Claims harvested from spike branches. Append-only: claims are never
deleted — supersede or retire them via the status field. Reviews judge
only `active` claims whose scope intersects the diff.

## CLM-001: <short title>

- status: active
- scope: <project-relative module path, e.g. src/hooks/preToolUse>
- claim: <single PASS/FAIL-judgeable sentence>
- observable: <HOW to observe — test id, command, artifact path>
- expected: <the distinct verifiable outcome>
- source: spike/<branch> harvest <ISO date> (D-NN)
```

### Claim Drafting Rules

The PreToolUse hook denies writes that violate the mechanical tier;
the semantic tier is interview discipline:

| Tier       | Rule                                                                       | Enforced by      |
| ---------- | -------------------------------------------------------------------------- | ---------------- |
| mechanical | claim/observable/expected/scope/status all present and non-empty           | hook (deny)      |
| mechanical | status ∈ active \| superseded \| retired                                   | hook (deny)      |
| mechanical | claim ids unique; existing ids never disappear (append-only)               | hook (deny)      |
| mechanical | claim == expected or observable == expected (normalized) → tautology       | hook (deny)      |
| semantic   | claim is falsifiable — a competent reviewer could mark it FAIL             | interview        |
| semantic   | observable names a concrete probe, not a restatement of the claim         | interview        |
| semantic   | scope is the narrowest module path that contains the behavior              | interview        |

Status transitions (`active → superseded/retired`) require human
confirmation — never retire a claim as a side effect of automation.

## Harvest Manifest Schema

Path: `.filid/harvest/<normalized-branch>/manifest.json` — local gate
state, deliberately NOT committed (committing it would move HEAD past
its own `head_sha`). Branch normalization is the same `/` → `--`
mapping used by `.filid/review/` (`mcp_t_review_manage normalize-branch`).

| Field                 | Meaning                                                                    |
| --------------------- | --------------------------------------------------------------------------- |
| `base_sha`            | merge-base the spike grew from                                             |
| `head_sha`            | HEAD after the harvest commit — the currency anchor                         |
| `diff_hash`           | sha256 of `git diff <base_sha>..HEAD` at seal time                          |
| `criteria_delta_hash` | sha256 of the claim block text appended this harvest                        |
| `created_at`          | ISO 8601 seal time — drives the 7-day timebox emphasis                      |
| `decisions`           | full interview record: `{id, disposition, claim}` per extracted decision    |

Currency rule consumed by the gates (pipeline Signal 0, review Step 1
guard, the per-prompt banner): the manifest is **current** iff
`head_sha == git rev-parse HEAD`. Missing, unparsable, or stale ⇒ the
merge track stays closed. `sha256` via `shasum -a 256` (macOS) or
`sha256sum` (Linux).

## Decision-Extraction Heuristics

Surface choices the code made that the INTENT tree does not record:

- **Contract**: new/changed exported function signatures, file formats,
  CLI flags, hook output shapes → claim about the contract's behavior.
- **Boundary**: a module now imports across a boundary, or a new module
  exists → claim about the dependency direction or the module's purpose.
- **Policy**: error handling (throw vs null vs log), retry/timeout
  values, cache invalidation, ordering guarantees → claim with the
  threshold/policy as `expected`.
- **Rejected path**: code that was tried and abandoned inside the spike
  (visible in intermediate commits) → usually Discard, but a Keep here
  becomes a *negative* claim ("X must NOT …") — these are valuable.

NOT decisions: formatting, renames without semantic change, comment
edits, dependency bumps without behavior delta.

## Incremental Re-Harvest

A stale manifest (commits after seal) does not restart from zero:

1. Read the old manifest's `decisions` array.
2. Extract decisions from the FULL diff `<base_sha>..HEAD` again.
3. Interview only decisions that are new or whose evidence changed;
   prior `keep` claims already live in the ledger (never re-ask — the
   ledger is append-only).
4. Seal a fresh manifest (new `head_sha`, merged `decisions`).

## Disposal Mechanics

| Choice    | Git effect                                                                                       | When                                                    |
| --------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Discard   | new work branch from `base_sha` + cherry-pick of the single harvest commit + `git branch -D` spike | default — probe code was scaffolding, claims are the yield |
| Promote   | `git branch -m` off the `spike/` namespace                                                        | probe code is production-quality; full review still applies |
| Keep as-is | none                                                                                              | more probing planned; banner keeps tracking               |

After Discard, the work branch enters the normal pipeline (Path A):
pr-create → review (claims judged) → resolve → revalidate. After
Promote, the renamed branch does the same — the spike exemption ends
the moment the branch name leaves `spike/*`.

## Residual Risk (explicit non-goal)

Git-level bypass — cherry-picking or rebasing spike commits onto a
normal branch without harvesting — is NOT mechanically blocked: rebase
rewrites SHAs, so detection is unsound in principle. The defense is the
entry-point guards plus manifest invalidation; no further promise is
made. This is a recorded residual risk, not an oversight.
