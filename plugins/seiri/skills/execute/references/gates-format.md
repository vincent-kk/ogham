# Gate ledger format

The ledger is the task's durable proof surface. Machines and people read the same Markdown.

```markdown
# Gates: <task name>

Plan: plan.md

## Task 1 — <task name>

- [ ] G1: <observable result — make it decidable by a stranger>
      CHECK: `<shell command, executed verbatim>`
      EXPECT: `<fixed literal substring emitted only when the condition holds>`
      EVIDENCE: pending

- [ ] G2: <manual gate — only when a command cannot prove it>
      EVIDENCE: pending

## Final

- [ ] G9: this repository's designated verification passes
      CHECK: `<the repository's verification command — from CLAUDE.md>`
      EXPECT: `<success marker>`
      EVIDENCE: pending

ABANDON: G2 <reason — only when abandoning a gate>
```

## Ledger rules

| Rule                               | Contract                                                                                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Checkbox = claim; EVIDENCE = proof | A checked box with `EVIDENCE: pending` is UNMET.                                                                                          |
| Verdict                            | The EXPECT match inside the observed output decides. A runnable gate without EXPECT is never met on any host — an exit code is not proof. |
| ABANDON                            | Counts as resolved, remains separately visible, and always carries a reason.                                                              |
| Evidence cap                       | Store the EXPECT-matching line plus the last non-empty line, at most 200 characters including any suffix.                                 |
| ID                                 | Use globally unique `G<n>` IDs; `##` headings only group gates.                                                                           |
| Plan                               | `Plan:` is a ledger-relative path for people; tools do not interpret it.                                                                  |
| Literal fields                     | Wrap CHECK and EXPECT values in a Markdown code span. Matching edge runs are wrapper syntax; values without them remain compatible.       |
| Matching                           | EXPECT is a trimmed, case-sensitive literal substring of one output line. Slashes, metacharacters, and flags have no special meaning. No regex mode or legacy-ledger migration is provided. |

## Authoring rules

1. State an observable result, never an activity.
2. Design CHECK and EXPECT together. CHECK tests the actual result condition; EXPECT names a fixed literal string emitted only when that condition holds.
3. Put the success signal in the **output**: `<assertion command> && echo <MARKER>` with `EXPECT: <MARKER>`. The assertion must fail when the result condition is false; a command that only reports data needs an assertion before `&& echo`. This keeps the marker out of failed checks even when a host exposes no exit code. A fixed success-only string already emitted by the check, such as `TYPECHECK_OK`, qualifies too.
4. For an expected failure, put the negation inside CHECK — `! grep -rn 'TODO' src && echo NO_TODOS` — instead of expecting the harness to report the failure for you.
5. Wrap each CHECK and EXPECT value in a Markdown code span. If the value contains backticks, use a longer delimiter run; if it starts and ends with backticks, add one padding space inside each delimiter. Without the span, a formatter can rewrite sequences such as `__x__` and `*x*`, stop command matching, and make the gate disappear silently.
6. Give each task 1–4 runnable gates; zero is underspecified and more than four means two tasks.
7. Put this repository's designated verification in `## Final`.
8. Give every number in the final report a CHECK that measures it.
9. Write CHECK for the repository root. The Bash tool keeps its working directory between calls, so a bare `cd dir && …` strands the next CHECK — use a subshell: `(cd dir && …)`.
10. Write gate statements, `##` headings, and ABANDON reasons in the session's response language — what the harness configures for replies, else the language of the replies. The fixed markers `Plan:`, `G<n>`, `CHECK:`, `EXPECT:`, `EVIDENCE:`, `ABANDON:`, and `## Final` stay verbatim, and so do CHECK and EXPECT values.

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
- `record` records evidence only for a manual gate; a gate with CHECK must be proven by running that CHECK.

The tool never executes a command and never creates a ledger.

## Hook verdicts

A command matching CHECK receives exactly one line, in one of these forms — the same on every host:

1. `[seiri] payment-refactor G3 met — evidence recorded (4/7, next G5)` — EXPECT matched the observed output.
2. `[seiri] payment-refactor G3 unmet — EXPECT "8/8 passed" not in output (exit 1)` — the output did not carry it.
3. `[seiri] payment-refactor G3 unmet — no output (exit 1)` — the command printed nothing to judge.
4. `[seiri] payment-refactor G3 unjudgeable — a runnable gate needs an EXPECT that only success prints` — the gate has a CHECK but no EXPECT.

Agent-run evidence ends with `(via agent <id>)`; a driver re-run clears that marker. Any re-run of a met gate that does not come back met reopens the checkbox and writes `pending (regressed)`.

## Hosts

The verdict reads the observed output text, because that is the only channel every host provides. Claude Code splits success and failure into two events and reports an exit code; Codex sends one event whose payload is the output as a plain string, and its code-mode exec reports no exit code at all. Exit codes therefore decorate the reason and the evidence (`(exit N)`) and never decide the verdict — which is what rule 3 is for. Where a host lacks a field entirely (Codex has no interrupt flag), the difference only ever yields a conservative unmet, never a false met.

## Formatter safety

Markdown formatters preserve code-span contents. The parser removes equal-length wrapping backtick runs and Markdown's optional single-space padding from CHECK and EXPECT before matching. Values without matching edge runs keep their existing meaning.

Matching edge runs now denote the wrapper. A literal command that itself starts and ends with backticks must therefore use a longer padded span:

```markdown
CHECK: `` `printf true` ``
```
