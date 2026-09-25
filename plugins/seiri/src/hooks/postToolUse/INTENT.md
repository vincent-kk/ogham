# postToolUse — Paired results and scoped evidence

## Purpose

Apply acknowledged lifecycle requests and record Bash evidence only for the active actor, native turn, generation, and task. Skill loading has no effect.

## Conventions

- Require an exact successful Pre/Post pairing before applying lifecycle effects.
- Judge CHECK evidence through normalized output and literal EXPECT; absent data never means success.
- Retain regression and agent provenance while suppressing unchanged verdict/evidence notifications.
- Keep failure counters within the active binding and ignore interrupted execution.

## Boundaries

### Always do

- Fail open and leave no-op stdout empty.
- Evaluate whether a new signal would overreact to an intended red test.
- Use concrete gate imports to stay within bundle budgets.

### Ask first

- Change failure thresholds or widen supported tool matching.

### Never do

- Control tool permissions, reflect whole commands or stderr into context, or observe inactive tasks.
- Treat accepted as activation, finish as proof, or missing provenance as a match.
