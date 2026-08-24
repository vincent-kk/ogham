---
name: scaffold-pr
user-invocable: true
description: 'Creates a Draft PR from a Story/Task/Bug issue with its sub-task checklist in the PR body — branch, empty commit, and PR only, no code changes. Use for "scaffold pr", "draft pr", "이슈 PR".'
argument-hint: '<issue> [--base BRANCH] [--draft true|false]'
version: '1.1.0'
complexity: moderate
plugin: imbas
---

> **EXECUTION MODEL**: Execute all workflow steps as a SINGLE CONTINUOUS OPERATION. After each step completes, IMMEDIATELY proceed to the next in the SAME TURN. NEVER yield after MCP tool calls, `/imbas:read-issue` returns, `[OP:]` operations, or `gh`/`git` command results.
>
> **Valid reasons to yield**:
>
> 1. User decision genuinely required
> 2. Terminal stage marker emitted: `PR created: <url>` or `scaffold-pr BLOCKED: <reason>`
>
> **HIGH-RISK YIELD POINTS**:
>
> - After `/imbas:read-issue` returns — immediately continue to sub-task fetching
> - After provider sub-task fetch — immediately derive fields and run the scaffold script
> - After the scaffold script returns — immediately report the PR URL in the same turn

# scaffold-pr — Issue-based Draft PR Scaffolding

Create a Draft PR from an issue with its sub-tasks rendered as a checklist in the PR body. No code changes — empty commit only.

## When to Use This Skill

- To scaffold a PR before starting implementation
- To create a tracking PR that links an issue to its sub-task checklist
- As the handoff step after split creates issues for a plan

## Arguments

```
/imbas:scaffold-pr <issue> [--base <branch>] [--draft <true|false>]

<issue>  : Issue reference — Jira key (e.g., PROJ-123) or GitHub issue (e.g., owner/repo#42)
--base   : Target branch for the PR (default: repo's default branch)
--draft  : Create as Draft PR (default: true)
```

## References

- [Workflow](./references/workflow.md) — 5-step provider-agnostic skeleton
- [Tools](./references/tools.md) — MCP tools, Bash commands, and skill invocations
- [Error Handling](./references/errors.md) — Error conditions and recovery

<!-- imbas:constraints-v1 -->

## Workflow (Provider-agnostic skeleton)

0. Read `config.provider` via `mcp__plugin_imbas_tools__config_get`. If provider is `local`, emit terminal marker `scaffold-pr BLOCKED: local provider not supported — PR creation requires a remote git host.` and end. Do NOT continue.
1. Read issue via `/imbas:read-issue <issue> --depth shallow`.
2. Load ONLY the provider-specific workflow file matching `config.provider`:

   | provider | workflow file                   |
   | -------- | ------------------------------- |
   | `jira`   | `references/jira/workflow.md`   |
   | `github` | `references/github/workflow.md` |

3. Execute provider-specific steps to fetch sub-tasks.
4. Derive PR fields (branch, title, commit message, body), write them to scratch files, and run the bundled `scripts/scaffold-pr.mjs` per `references/workflow.md` Step 4.

## Constraints

- When running as provider X, MUST NOT read any file under `references/Y/**` for any other Y.
- Provider-specific operations (`[OP:]` notation for Jira, `gh` CLI for GitHub) MUST only be invoked from within the matching `references/<provider>/` workflow.
- This skill MUST NOT modify any source files. Only git branch, empty commit, and PR creation are allowed.
- The git/gh sequence (branch, empty commit, push, PR) is owned by the bundled `scripts/scaffold-pr.mjs` — byte-identical to the seiri copy. This skill MUST NOT issue those git/gh commands directly.
- `local` provider is not supported — PR creation requires a GitHub-hosted remote (`gh` CLI). Note: provider=jira also uses `gh` for the PR itself (Jira issue + GitHub code).
