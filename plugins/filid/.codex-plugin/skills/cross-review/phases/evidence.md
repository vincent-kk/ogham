# Evidence Phase — Technical Measurement

> **MANDATORY OUTPUT**: You MUST write your output file before
> completing — `<REVIEW_DIR>/verification.md` (`SCOPE: full`) or
> `<REVIEW_DIR>/verification.<half>.partial.md` (half scopes). All
> analysis is meaningless without the written file. If you run low on
> budget, skip remaining stages and write the file with what you have
> (mark skipped stages `SKIP`).

> **STREAMING-WRITE DISCIPLINE**: do NOT accumulate per-file results in
> working memory. `Write` the full skeleton (frontmatter + empty tables,
> every unresolved value `PENDING`) FIRST; after each MCP call,
> immediately `Edit`-append the result row and drop the raw response
> from memory. Set the `verification_passed` sentinel to its real value
> as your LAST edit — it stays `PENDING` until every row is written and
> is the done-marker the chairperson keys on.

You are the evidence agent for `/filid:cross-review`. You run every MCP
measurement the committee will cite — personas and the chairperson never
measure. Scope is **changed files and their fractals only**, except the
explicitly project-wide calls below.

## Execution Context (provided by chairperson)

- `REVIEW_DIR`, `PROJECT_ROOT`, `BASE_REF`, `BRANCH`
- `SCOPE`: `full` | `metrics-half` | `structure-half`

## Stage 0 — Collect scope (all SCOPEs)

```bash
git diff <BASE_REF>..HEAD --name-only
```

Build: `CHANGED_FILES` (source), `CHANGED_DIRS`, `CHANGED_SPEC_FILES`
(`*.spec.ts` only; the 3+12 cap is spec-only), `CHANGED_TEST_FILES`
(`*.test.ts`, tracked only for the advisory promote hint),
`CHANGED_INTENT_MDS`, `CHANGED_DETAIL_MDS`.
Then `mcp__plugin_filid_tools__fractal_scan(path: <PROJECT_ROOT>)` → keep
`tree.nodes` as the node-type lookup (no per-directory classify calls).
A stage with an empty input list is recorded `SKIP`.

## Metrics stages (`full` and `metrics-half`)

1. **Code metrics** — for each `CHANGED_FILES` entry (skip `index.ts`,
   `*.d.ts`, spec/test files):
   `mcp__plugin_filid_tools__ast_analyze(analysisType: "lcom4", ...)` and
   `mcp__plugin_filid_tools__ast_analyze(analysisType: "cyclomatic-complexity", ...)`.
   Thresholds: LCOM4 >= 2 → FAIL (`restructure`); CC > 15 → FAIL
   (`code-fix`).
2. **Test compliance (3+12)** — the cap is **spec-only**. For each
   `CHANGED_SPEC_FILES` (`*.spec.ts`) entry:
   `mcp__plugin_filid_tools__test_metrics(action: "check-gate", ...)` (+
   `count` / `decide` for split hints). Total > 15 cases → FAIL
   (split / parameterize the spec). `.test.ts` files are EXEMPT —
   `check-gate` intentionally returns empty for them (that is correct, not a
   broken tool; never manually re-report a `.test.ts` as a 3+12 violation).
   A large, stable `.test.ts` (`CHANGED_TEST_FILES`) is at most a WARN
   "candidate for `/filid:promote`", never a FAIL.
3. **Shared dependency coverage** — for shared modules in the changed
   fractals (imported by 2+ sibling fractals):
   `mcp__plugin_filid_tools__coverage_verify(projectRoot, targetPath)`.
   `uncoveredCount > 0` → **WARN** (never FAIL).

## Structure stages (`full` and `structure-half`)

4. **Fractal boundaries** —
   `mcp__plugin_filid_tools__structure_validate(path: <PROJECT_ROOT>)`;
   report only nodes intersecting the changed fractals. Organ dir with
   INTENT.md → HIGH; fractal dir missing INTENT.md → MEDIUM; type
   mismatch → HIGH.
5. **Document compliance** — for each `CHANGED_INTENT_MDS`: line count
   <= 50 (over → HIGH; 40-50 → LOW warning) and the three tier sections
   ("Always do" / "Ask first" / "Never do"; missing → MEDIUM). For each
   `CHANGED_DETAIL_MDS`: append-only growth (duplicate historical
   sections) → MEDIUM. **DETAIL.md has NO line cap** — never record a
   "DETAIL.md exceeds N lines" finding; record the cap scope in the
   output so downstream personas cannot misapply it.
6. **Dependency acyclicity** — for each `CHANGED_FILES` entry:
   `mcp__plugin_filid_tools__ast_analyze(analysisType: "dependency-graph", ...)`.
   New cycle → CRITICAL; cross-fractal sibling import without a shared
   organ → HIGH.
7. **Semantic diff** — for changed files with old+new versions:
   `mcp__plugin_filid_tools__ast_analyze(analysisType: "tree-diff", ...)` →
   record interface additions/removals (INFO).
8. **Structure drift** —
   `mcp__plugin_filid_tools__drift_detect(path: <PROJECT_ROOT>)`; skip when
   stage 4 passed clean for every changed fractal.
9. **Debt bias** — `mcp__plugin_filid_tools__debt_manage(action: "list", projectRoot)`;
   when debts touch changed fractals,
   `mcp__plugin_filid_tools__debt_manage(action: "calculate-bias", ...)`.
   ALWAYS emit `debt_bias_level` (`LOW_PRESSURE` when no debts).
10. **Acceptance claims** — load `.filid/criteria.md` from BOTH base
    (`git show <BASE_REF>:.filid/criteria.md`, tolerate absence) and
    HEAD. Judged set per `../contracts.md` → "Acceptance Claims": active
    claims whose `scope` prefix matches a changed file, including claims
    flipped out of `active` within the diff (annotate
    `transition: active → <status>`). Copy `id`, `claim`, `observable`,
    `expected`, `scope` for each; write `none` when empty.
    (`metrics-half` runs skip this stage — it belongs to
    `structure-half` and `full`.)

## Output — verification.md

```markdown
---
session_ref: session.md
scope: <full | metrics-half | structure-half>
verification_passed: <true|false> # PENDING in the skeleton; set LAST
critical_failures: <count of CRITICAL + HIGH findings>
lcom4_failures: <n>
cc_failures: <n>
test_rule_failures: <n>
coverage_warnings: <n>
debt_bias_level: <LOW_PRESSURE|MODERATE_PRESSURE|HIGH_PRESSURE|CRITICAL_PRESSURE>
created_at: <ISO 8601>
---

## Code Metrics Results

| Check           | Result         | Detail                        |
| --------------- | -------------- | ----------------------------- |
| LCOM4           | PASS/WARN/FAIL | <failing modules + values>    |
| Cyclomatic (CC) | PASS/WARN/FAIL | <failing files + values>      |
| 3+12 rule       | PASS/WARN/FAIL | <failing spec files + counts> |
| Shared coverage | PASS/WARN      | <uncovered consumers>         |

## Structure & Dependency Verification

> Cap scope: INTENT.md = 50-line hard cap; DETAIL.md = no line cap
> (in-place restructure required; append-only growth forbidden).

| Check                 | Result         | Detail                          |
| --------------------- | -------------- | ------------------------------- |
| Fractal boundary      | PASS/WARN/FAIL | <violating paths>               |
| INTENT.md compliance  | PASS/WARN/FAIL | <over-cap files, missing tiers> |
| DETAIL.md compliance  | PASS/WARN/FAIL | <append-only growth>            |
| Circular dependencies | PASS/WARN/FAIL | <cycle chains>                  |
| Semantic diff         | INFO           | <interface changes>             |
| Structure drift       | PASS/WARN/FAIL | <drift findings>                |

## Findings

| Sev | Stage | Path | Rule | Current | Recommended Fix |
| --- | ----- | ---- | ---- | ------- | --------------- |

## Debt Status

| Existing Debts | PR-Related | Total Weight | Bias Level |
| -------------- | ---------- | ------------ | ---------- |

## Acceptance Claims (in scope)

<claim rows, or `none`>
```

Half scopes write only their own sections (plus frontmatter with the
fields they own); leave the other half's counters out entirely.

## Merge (chairperson-side, split path only)

`verification.metrics-half.partial.md` +
`verification.structure-half.partial.md` → `verification.md`: union
the body sections, dedup Findings rows by `path + rule`, take frontmatter
counters from the half that owns them, recompute `critical_failures` and
`verification_passed` over the merged Findings, keep `scope: full`.

No further split exists above the two halves — the streaming-write
discipline keeps memory flat regardless of file count, so a large diff
just means more appended rows, never more subagents.

## Important Notes

- Write ONLY your assigned output file — nothing else.
- If an MCP tool call fails for a file, record the row as `SKIP` with
  the reason and continue.
- Debt bias levels (consumed by the committee): LOW_PRESSURE 0-5,
  MODERATE_PRESSURE 6-15, HIGH_PRESSURE 16-30, CRITICAL_PRESSURE 31+.
