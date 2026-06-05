# simulate-defense — Defense Q&A Rehearsal

## Purpose

Interactive rehearsal skill. The committee personas pose the questions a real
panel would ask, the author answers, and the rebuttal-strategist coaches each
answer. It reuses the prawf review personas and produces preparation material —
never a verdict. Tier-2b: it yields only at the author-answer step.

## Structure

| Path       | Role                                                       |
| ---------- | ---------------------------------------------------------- |
| `SKILL.md` | resolve questions → present → [answer] → coach → output     |

## Conventions

- Reuses `../../agents/` personas; does not define new reviewers.
- Questions come from a prior `qa-sheet.md` or a LIGHT panel run on the paper.
- Interactive by default (`<!-- [INTERACTIVE] -->` at the answer step); `--batch`
  makes it non-interactive (Tier-2a).
- Output `defense-session.md` is advisory; it carries no Accept/Reject verdict.

## Boundaries

### Always do

- Coach honestly: name gaps and fatal flaws instead of manufacturing a defense.
- Keep the answer step the only interactive yield point.

### Ask first

- Adding a verdict or pass/fail outcome (this skill is rehearsal, not judgment).

### Never do

- Answer the panel's questions on the author's behalf in interactive mode.
- Redefine persona logic instead of spawning the reviewer / strategist agents.

## Dependencies

- Personas: `../../agents/*.md`. Prompts: `../review/prompt-templates.md`.
