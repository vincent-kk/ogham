---
name: imbas-scaffold-pr
user_invocable: true
description: "[imbas:imbas-scaffold-pr] Create a Draft PR from an issue (Story/Task/Bug) with sub-task checklist in the PR body. Scaffolds branch, empty commit, and PR without code changes. Trigger: \"scaffold pr\", \"PR 생성\", \"draft pr\", \"이슈 PR\""
argument-hint: "<issue> [--base BRANCH] [--draft true|false]"
version: "1.0.0"
complexity: moderate
plugin: imbas
---

# imbas-scaffold-pr — Issue-based Draft PR Scaffolding

Create a Draft PR from an issue with its sub-tasks rendered as a checklist
in the PR body. No code changes — empty commit only.

## When to Use This Skill

- To scaffold a PR before starting implementation
- To create a tracking PR that links an issue to its sub-task checklist
- As the first step after devplan creates Subtasks for a Story

## Arguments

```
/imbas:imbas-scaffold-pr <issue> [--base <branch>] [--draft <true|false>]

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

1. Read issue via `/imbas:imbas-read-issue <issue> --depth shallow`.
2. Read `config.provider` via `config_get`.
3. Load ONLY the provider-specific workflow file matching `config.provider`:

   | provider | workflow file |
   |---|---|
   | `jira`   | `references/jira/workflow.md` |
   | `github` | `references/github/workflow.md` |

4. Execute provider-specific steps to fetch sub-tasks.
5. Execute shared steps (branch creation, empty commit, PR creation) per `references/workflow.md`.

## Constraints

- When running as provider X, MUST NOT read any file under `references/Y/**` for any other Y.
- Provider-specific operations (`[OP:]` notation for Jira, `gh` CLI for GitHub) MUST only be invoked from within the matching `references/<provider>/` workflow.
- This skill MUST NOT modify any source files. Only git branch, empty commit, and PR creation are allowed.
- `local` provider is not supported — PR creation requires a remote git host.
