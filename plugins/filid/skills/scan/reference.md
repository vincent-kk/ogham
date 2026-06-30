# scan — Reference Documentation

Detailed workflow, severity definitions, and report formats for the FCA-AI
rule scanner. For the quick-start guide, see [SKILL.md](./SKILL.md).

## Section 1 — Tree Construction

Call `mcp__plugin_filid_t__fractal_scan` to build the complete hierarchy by scanning the filesystem.

```
mcp__plugin_filid_t__fractal_scan({ path: "<target-path>" })
```

The response is a `ScanReportDto` whose `tree.nodes` is a **flat array** of
`FractalNode` objects. Iterate with `tree.nodes.map(...)` or
`tree.nodes.filter(...)`. The array is the single source of truth — no
companion list, no path-keyed dict.

Partition into three working sets by filtering `tree.nodes`:

- **fractal nodes** — nodes with `hasIntentMd: true` or `type: "fractal"`
- **organ nodes** — nodes with `type: "organ"` or names matching `ORGAN_DIR_NAMES`
- **spec files** — files matching `*.spec.ts` pattern

## Section 2 — INTENT.md Validation

For every fractal node that has a INTENT.md, perform two checks:

**Check 2a — Line count**

Read the INTENT.md content and count lines.

| Condition        | Severity | Violation ID           |
| ---------------- | -------- | ---------------------- |
| `lineCount > 50` | high     | `INTENT_MD_LINE_LIMIT` |

**Check 2b — 3-tier boundary sections**

Verify that all three required headings are present:

- `### Always do`
- `### Ask first`
- `### Never do`

| Condition           | Severity | Violation ID                   |
| ------------------- | -------- | ------------------------------ |
| Any section missing | high     | `INTENT_MD_MISSING_BOUNDARIES` |

Note: The validator matches English headings only (`### Always do`, `### Ask first`,
`### Never do`). These headings MUST remain in English. Content follows the language specified by the `[filid:lang]` tag; default to English if absent.

## Section 3 — Organ Directory Validation

For every directory whose name matches `ORGAN_DIR_NAMES`, check that no
INTENT.md is present inside it.

| Condition                     | Severity | Violation ID              | Auto-fixable |
| ----------------------------- | -------- | ------------------------- | ------------ |
| INTENT.md exists in organ dir | critical | `ORGAN_INTENT_MD_PRESENT` | Yes (delete) |

`ORGAN_DIR_NAMES` (name-matched) = `components`, `utils`, `types`, `hooks`, `helpers`,
`lib`, `styles`, `assets`, `constants`, `test`, `tests`, `spec`, `specs`,
`fixtures`, `e2e`, `references`.

Pattern-matched (priority 3, NOT list members): `__name__` wrapping (e.g., `__tests__`, `__mocks__`, `__fixtures__`), `.name` dot-prefix — see `templates/rules/filid_fca-policy.md` → **Node Classification Priority**.

## Section 4 — Test File Validation (3+12 Rule)

Collect all spec files and call `mcp__plugin_filid_t__test_metrics` with `action: "check-312"`.

```
mcp__plugin_filid_t__test_metrics({
  action: "check-312",
  files: [{ filePath: "<path>", content: "<source>" }, ...]
})
```

The 3+12 rule: each `*.spec.ts` file must have at most **15 test cases**
total, with a recommended distribution of 3 basic + 12 complex.

| Condition                     | Severity | Violation ID        |
| ----------------------------- | -------- | ------------------- |
| `total > 15` in any spec file | high     | `TEST_312_EXCEEDED` |

Note: `*.test.ts` files are excluded from this check.

## Section 5 — Report Formats

### Without `--fix` — report only

```
FCA-AI Scan Report
==================
Target        : <path>
Checks run    : <n>
Total violations: <n>

CRITICAL (<n>)
  [ORGAN_INTENT_MD_PRESENT] src/utils/INTENT.md
    Organ directories must not contain INTENT.md.
    Remediation: delete the file or reclassify the directory.

  [INTENT_MD_LINE_LIMIT] src/payments/INTENT.md — 117 lines (limit: 50)
    Remediation: compress or split the document.

HIGH (<n>)
  [TEST_312_EXCEEDED] src/payments/payment.spec.ts — 18 tests (limit: 15)
    Remediation: split into multiple spec files or parameterise cases.

MEDIUM (<n>)
  ...

Auto-fixable  : <n> of <total>
Run with --fix to apply automatic remediations.

Scan complete: <N> violations
```

The final `Scan complete: <N> violations` line (or
`Scan complete: no violations found` when N=0) is the **terminal marker** —
emit it as the last line of the response, then end execution.

### With `--fix` — apply remediations then re-validate

| Violation                      | Auto-fix Action                                                                | Agent             |
| ------------------------------ | ------------------------------------------------------------------------------ | ----------------- |
| `ORGAN_INTENT_MD_PRESENT`      | Delete the INTENT.md from the organ directory                                  | `code-surgeon`    |
| `INTENT_MD_MISSING_BOUNDARIES` | Append skeleton boundary sections to the file                                  | `context-manager` |
| `INTENT_MD_LINE_LIMIT`         | Trim and compress to bring within the 50-line limit (via `mcp__plugin_filid_t__doc_compress`) | `context-manager` |
| `TEST_312_EXCEEDED`            | Parameterize repetitive `it()` blocks into `it.each()` tables                  | `code-surgeon`    |

### Auto-fix Dispatch — parallel `Task` calls

Launch all applicable fix agents in **a single response, parallel block** of
`Task` tool calls. Do NOT use `run_in_background: true` — that yields the turn.
Mix different `subagent_type` values in the same block freely;
`filid:context-manager` and `filid:code-surgeon` target non-overlapping file
types (INTENT.md/DETAIL.md vs. file deletion / test refactoring) so parallel
execution is safe without file locking.

For an `INTENT_MD_LINE_LIMIT` violation:

```
Task(
  subagent_type: "filid:context-manager",
  model: "sonnet",
  prompt: "Trim and compress <abs path>/INTENT.md to ≤50 lines while preserving the 3-tier boundary sections (### Always do, ### Ask first, ### Never do). Rewrite the file directly with the Edit tool — mcp__plugin_filid_t__doc_compress(mode: 'auto') only returns compaction metadata (compacted reference, cap_applies), not rewritten content. Return the final line count and a one-line summary."
)
```

For an `INTENT_MD_MISSING_BOUNDARIES` violation:

```
Task(
  subagent_type: "filid:context-manager",
  model: "sonnet",
  prompt: "Append the three required boundary sections (### Always do, ### Ask first, ### Never do) to <abs path>/INTENT.md if any are missing. Each section gets one bullet placeholder ('- TBD'). Do NOT exceed the 50-line limit. Return the new line count."
)
```

For an `ORGAN_INTENT_MD_PRESENT` violation:

```
Task(
  subagent_type: "filid:code-surgeon",
  model: "sonnet",
  prompt: "Delete the file at <abs path>/INTENT.md. The directory is classified as an organ, which forbids INTENT.md. Return 'deleted' on success."
)
```

For a `TEST_312_EXCEEDED` violation:

```
Task(
  subagent_type: "filid:code-surgeon",
  model: "sonnet",
  prompt: "Refactor <abs path>.spec.ts so that the total `it()` count is ≤15. Parameterize repeated `it()` blocks into `it.each()` tables. Preserve test intent. Return the new test count."
)
```

Violations requiring architectural decisions (reclassification, missing index.ts,
structural drift) are reported but not auto-fixed — run `/filid:sync` or
`/filid:restructure` for those.

After all agent fixes complete, re-run Phases 2–4 on fixed files and append
a fix summary:

```
Auto-fix Summary
----------------
Fixed   : <n>
Skipped : <n> (require manual remediation)

Scan complete: <N> violations
```

`<N>` here is the count of **remaining** violations after re-validation.
Use `Scan complete: no violations found` when zero remain.

## Violation Quick Lookup

| ID                             | Severity | Auto-fix | Agent             |
| ------------------------------ | -------- | -------- | ----------------- |
| `INTENT_MD_LINE_LIMIT`         | high     | Yes      | `context-manager` |
| `INTENT_MD_MISSING_BOUNDARIES` | high     | Yes      | `context-manager` |
| `ORGAN_INTENT_MD_PRESENT`      | critical | Yes      | `code-surgeon`    |
| `TEST_312_EXCEEDED`            | high     | Yes      | `code-surgeon`    |
