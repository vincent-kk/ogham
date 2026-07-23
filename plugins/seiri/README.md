# seiri

> Welsh `saer`, "craftsman" — plural. Rules for the discipline of making.

A Claude Code plugin that follows one principle: **code should be legible
to the agents that read it.** It ships a small set of rules about code
authoring, review discipline, and development method, and deploys the
ones you choose into your repository.

Korean documentation: [README-ko_kr.md](./README-ko_kr.md)

## What it does

Rules you select are written to `.claude/rules/seiri_*.md`. The harness
loads them at the start of every session — seiri does not inject their
text, because that would spend the same context twice.

What it does inject is the part the files cannot state about themselves:
which rules are active, where the intervention dial sits, and whether any
deployed rule has been edited away from the shipped version.

## Install

```
/plugin install seiri
/seiri:setup
```

`/seiri:setup` opens a local settings page listing every available rule.
Nothing is written until you save, and the page shows the exact diff
first — these files become standing instructions in your repository, so
you decide what lands before it lands.

## Design

**It does not own your repository's truth.** Which verification command
to run, which thresholds apply, what "done" means — those belong to your
tests, your CI, and your `CLAUDE.md`. seiri holds no copy of them,
because a copy would drift.

**It does not own the model's judgment.** There are no blocking hooks and
no approval gates. Rules are context, and the plugin states plainly which
of them are merely context and which your repository actually enforces.

**Every rule yields.** Each one opens with the same precedence chain:
your repository's instructions, then its existing conventions, then the
rule. On conflict, the rule steps aside.

**Every rule is optional.** There is no required rule and nothing is
deployed without an explicit choice.

## Relationship to filid

The two divide by layer. [filid](../filid) owns architecture, thresholds,
and review — the numbers and what they mean. seiri owns direction: the
principle without the number, so it holds in a repository that has never
heard of any particular architecture.

## Skills

Invoked by you:

| Skill               | Use                                              |
| ------------------- | ------------------------------------------------ |
| `/seiri:setup`      | Choose which rules this repository uses          |
| `/seiri:brainstorm` | Shape a change before writing it                 |
| `/seiri:interview`  | Turn a vague request into criteria that can fail |
| `/seiri:finish`     | Decide whether finished work integrates          |

Dispatched automatically when the moment fits:

| Skill                   | Use                                         |
| ----------------------- | ------------------------------------------- |
| `/seiri:write-plan`     | Break multi-step work into reviewable tasks |
| `/seiri:execute`        | Carry a written plan to done                |
| `/seiri:implement`      | Make a change test-first                    |
| `/seiri:trace-cause`    | Trace a failure to where it started         |
| `/seiri:verify-done`    | Check a completion claim before it is made  |
| `/seiri:request-review` | Hand work to review with a fixed scope      |
| `/seiri:receive-review` | Fold review feedback back into the code     |

## License

MIT
