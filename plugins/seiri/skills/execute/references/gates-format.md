# Gate ledger format

The ledger is the task's durable proof surface. Machines and people read the same Markdown.

```markdown
# Gates: <task name>

Plan: plan.md

## Task 1 — <task name>

- [ ] G1: <observable result — make it decidable by a stranger>
  CHECK: <shell command, executed verbatim>
  EXPECT: <substring | /regex/>
  EVIDENCE: pending

- [ ] G2: <manual gate — only when a command cannot prove it>
  EVIDENCE: pending

## Final

- [ ] G9: this repository's designated verification passes
  CHECK: <the repository's verification command — from CLAUDE.md>
  EXPECT: <success marker>
  EVIDENCE: pending

ABANDON: G2 <reason — only when abandoning a gate>
```

## Ledger rules

| Rule | Contract |
| --- | --- |
| Checkbox = claim; EVIDENCE = proof | A checked box with `EVIDENCE: pending` is UNMET. |
| Verdict | Match EXPECT when present; otherwise exit 0 decides. |
| ABANDON | Counts as resolved, remains separately visible, and always carries a reason. |
| Evidence cap | Store the EXPECT-matching line plus the last non-empty line, at most 200 characters total. |
| ID | Use globally unique `G<n>` IDs; `##` headings only group gates. |
| Plan | `Plan:` is a ledger-relative path for people; tools do not interpret it. |

## Authoring rules

1. State an observable result, never an activity.
2. Choose an EXPECT that appears only on success.
3. Make CHECK exit 0 on success; for an expected failure, match EXPECT against stderr.
4. Give each task 1–4 runnable gates; zero is underspecified and more than four means two tasks.
5. Put this repository's designated verification in `## Final`.
6. Give every number in the final report a CHECK that measures it.
7. Write CHECK for the repository root. The Bash tool keeps its working directory between calls, so a bare `cd dir && …` strands the next CHECK — use a subshell: `(cd dir && …)`.

## Task directory

```text
.seiri/tasks/<name>/
  plan.md
  gates.md
  gates.lock
```

Names match `^[a-z0-9]+(?:-[a-z0-9]+)*$`. The directory is owned by the task name, never a session; no file contains `session_id`. Its existence makes it observable without registration. `gates.lock` is temporary, the directory is not committed, and cleanup belongs to the user. A repository may place the plan elsewhere, but `Plan:` points there; the ledger and lock stay here.

## Tool

Use the full name `mcp__plugin_seiri_tools__gates`:

- `status` reads one named ledger or all ledgers and returns counts, next unmet CHECK, ABANDON entries, `met_by_agent`, and `all_met`.
- `abandon` appends a reasoned ABANDON entry.
- `record` records evidence only for a manual gate; a gate with CHECK must be proven by running CHECK in Bash.

The tool never executes a command and never creates a ledger.

## Hook verdicts

A Bash command matching CHECK receives exactly one line in one of these five forms:

1. `[seiri] payment-refactor G3 met — evidence recorded (4/7, next G5)` after exit 0 and an EXPECT match, or exit 0 with no EXPECT.
2. `[seiri] payment-refactor G3 unmet — EXPECT "8/8 passed" not in output` after exit 0 and a mismatch.
3. `[seiri] payment-refactor G3 met — matched on stderr (exit 1 by design)` after a non-zero exit whose error matches EXPECT.
4. `[seiri] payment-refactor G3 unmet — exit 1; EXPECT not in stderr` after a non-zero mismatch.
5. `[seiri] payment-refactor G3 unobservable — stdout is not visible after a non-zero exit; make the CHECK exit 0 (append || true) or EXPECT against stderr` when the intended output is inaccessible.

Agent-run evidence ends with `(via agent <id>)`; a driver re-run clears that marker. A failed re-run reopens the checkbox and writes `pending (regressed)`.

## Formatter warning

A Markdown formatter can rewrite `__tests__` as `**tests**` and break a CHECK; this was reproduced in this repository. Ignore `.seiri/` in the formatter or avoid `__x__` and `*x*` sequences in CHECK. Vitest filters are substring matches, so use a form such as `wiring.test`.
