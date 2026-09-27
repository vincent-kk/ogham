# seiri

> Welsh `saer`, "craftsman" — plural. Rules for the discipline of making.

A plugin for Claude Code and Codex that follows one principle: **code should be legible to the agents that read it.** It ships a small set of rules about code authoring, review discipline, and development method, and deploys the ones you choose into your repository.

Korean documentation: [README-ko_kr.md](./README-ko_kr.md)

## What it does

Rules you select are deployed to the host's project rule channel: Claude's rule files or Codex's managed AGENTS.md sections. The host loads them directly; seiri does not duplicate their text.

Skills remain available through user invocation or the host's normal skill selection. Hooks never select the first skill. Explanations, standalone traces, review-only requests, and routine edits do not acquire a development plan or ledger merely because seiri is installed.

Hooks default to **Skills only** (off). Off and advisory add no automatic context or new observations; trusted turn/session boundaries may invalidate existing participation. Standard and strict open each session with the workflow chain, an election line, and a rule/dial/drift summary; strict also repeats the one-line chain on turns with no active task. Task-scoped assistance — progress lines and gate updates — starts only when an entry skill (`write-plan`, `execute`) or an explicit `start` binds a task through the runtime tool, and stays active across later turns until it is paused, finished, or switched. Unbound tasks receive no progress line or gate updates.

A runtime request needs an explicit repository root and task name. An accepted MCP reply validates input; a paired hook acknowledgement confirms participation. At standard/strict, an active binding persists across new user turns; only a session boundary, `pause`, `finish`, or a different task's entry step end it. Resume only an existing binding for the same task, pause when leaving it open, and finish when its connection should end. A lifecycle finish is not proof that the work passed.

Ledgers are optional. For an active task with a ledger, paired Bash calls matching CHECK record evidence against EXPECT. Other tasks stay untouched; unchanged evidence does not repeatedly inject a verdict. Reuse valid verification evidence and choose checks appropriate to behavior changes, refactors, or documents.

Actor state expires after seven inactive days and invocation records after 24 hours. Missing host provenance or storage failures suppress assistance. A simultaneous failure to persist both revocation and its fallback marker cannot guarantee revocation survives storage recovery. Recorded native host identities and envelopes are covered; deliberately delayed native events crossing a new user turn remain an explicit acceptance limit.

At MCP server startup, seiri removes `sessions` and `tasks` entries unmodified for more than 72 hours regardless of git tracking or ignore status. Startup cleanup is skipped when the host cannot resolve the workspace.

## Install

```
/plugin install seiri
/seiri:setup
```

`/seiri:setup` opens a local settings page listing every available rule. Nothing is written until you save, and the page shows the exact diff first — these files become standing instructions in your repository, so you decide what lands before it lands.

## Design

**It does not own your repository's truth.** Which verification command to run, which thresholds apply, what "done" means — those belong to your tests, your CI, and your `CLAUDE.md`. seiri holds no copy of them, because a copy would drift.

**It does not own the model's judgment.** There are no blocking hooks and no approval gates. Rules are context, and the plugin states plainly which of them are merely context and which your repository actually enforces.

**Every rule yields.** Each one opens with the same precedence chain: your repository's instructions, then its existing conventions, then the rule. On conflict, the rule steps aside.

**Every rule is optional.** There is no required rule and nothing is deployed without an explicit choice.

**Documents follow the session's language.** Plans, gate ledgers, decision records, and clarified scopes are written in the language the harness configures for replies — seiri keeps no language setting of its own. Machine-read markers, identifiers, and code stay verbatim; HTML articles follow their named reader, and PR bodies follow the repository's conventions.

## Relationship to filid

The two divide by layer. [filid](../filid) owns enforceable structural boundaries, thresholds, and review — the numbers and what they mean. seiri owns direction: `architect` can preserve architectural intent, but it neither validates nor enforces that architecture. The distinction lets seiri stand alone in a repository that has never heard of any particular architecture.

## Skills

Invoked by you:

| Skill                    | Use                                                        |
| ------------------------ | ---------------------------------------------------------- |
| `/seiri:setup`           | Choose which rules this repository uses                    |
| `/seiri:architect`       | Preserve durable requirements, system views, and decisions |
| `/seiri:clarify-request` | Clarify a request into an actionable, testable scope       |
| `/seiri:scaffold-pr`     | Open an empty Draft PR before work starts                  |
| `/seiri:finish`          | Decide whether finished work integrates                    |
| `/seiri:explain`         | Explain how the code behaves through its concepts          |
| `/seiri:trace-change`    | Explain a code change for a reader, layer by layer         |

Available for host selection when their scope fits; no fixed chain is enforced:

| Skill                    | Use                                          |
| ------------------------ | -------------------------------------------- |
| `/seiri:write-plan`      | Plan substantial changes that need durable coordination  |
| `/seiri:review-plan`     | Prove a plan's claims before executing it    |
| `/seiri:execute`         | Carry a written plan to done                 |
| `/seiri:implement`       | Choose behavior, refactor, or artifact verification                     |
| `/seiri:trace-structure` | Map connections and data flow before judging |
| `/seiri:trace-cause`     | Trace a failure to where it started          |
| `/seiri:verify`          | Check a completion claim before it is made   |
| `/seiri:request-review`  | Hand work to review with a fixed scope       |
| `/seiri:receive-review`  | Fold review feedback back into the code      |

## Local development distribution

Build the shared providers and seiri before preparing a local plugin directory:

```sh
node scripts/buildAll.mjs --only=@ogham/cross-platform,@ogham/agent-artifacts,@ogham/http-kit,@ogham/session-finalizer,@ogham/seiri
node scripts/prepareSeiriDistribution.mjs --output /absolute/new/seiri-directory
node scripts/checkSeiriAdapters.mjs
```

Run these from the repository root. Preparation copies declared canonical inputs and current runtime, then regenerates host adapters with plugin-compiler; stale tracked adapters are not distribution inputs. Generated bundles and adapters are committed in a separate build commit rather than kept outside commits.

Local distribution acceptance does not publish a release. A distribution channel and its installation acceptance must be chosen before version changes, public release, or pushing or merging seiri changes (source and committed generated bundles/adapters) to a ref consumed by the remote marketplace.

## License

MIT
