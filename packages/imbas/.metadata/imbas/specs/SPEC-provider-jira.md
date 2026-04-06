---
version: 1.0
status: active
updated: 2026-04-06
---

# SPEC-provider-jira — Jira Provider Executor

## Purpose

Defines the placement rule and tool surface for the Jira provider. Jira is
the shipping primary provider for imbas. See `SPEC-provider.md` for the
overall abstraction.

## Placement rule

Jira-specific content lives inside each partitioned skill's
`references/jira/**` directory. A skill without a `references/jira/`
subdirectory is either not provider-aware (e.g. `imbas-pipeline`, `imbas-fetch-media`)
or has divergence below the 15-line threshold and handles Jira through
inline branching in a flat file.

Currently partitioned skills (RALPLAN v2 Phase C1-C5):
- `skills/imbas-manifest/references/jira/{workflow,tools,errors}.md`
- `skills/imbas-read-issue/references/jira/{workflow,tools,errors}.md`
- `skills/imbas-digest/references/jira/{workflow,tools,errors}.md`
- `skills/imbas-devplan/references/jira/{workflow,tools,errors}.md`

## Network path

Jira API calls are resolved at runtime by the LLM based on `[OP:]`
semantic notation in skill workflows. The LLM selects the appropriate
tool from the session's available tools (Atlassian Cloud MCP, on-premise
MCP, or custom plugin). imbas TypeScript code has no HTTP client for
Jira and MUST NOT acquire one — that would invert the LLM-orchestrated
architecture invariant in `BLUEPRINT.md`.

## Tool surface (Semantic Operations v0.2.0)

Skill workflows declare intent via `[OP:]` notation. The table below
maps operations to their Jira tool implementations for reference.

| Operation | Jira Tool | Used by |
|-----------|-----------|---------|
| `[OP: create_issue]` | `createJiraIssue` | manifest (batch create) |
| `[OP: create_link]` | `createIssueLink` | manifest (link creation, including 1:N expansion) |
| `[OP: add_comment]` | `addCommentToJiraIssue` | manifest (feedback comments), digest (publish) |
| `[OP: transition_issue]` | `transitionJiraIssue` | manifest (split-source Story Done), digest (suggestion trigger upstream) |
| `[OP: get_issue]` | `getJiraIssue` | read-issue, devplan (optional), manifest (drift check) |
| `[OP: search_jql]` | `searchJiraIssuesUsingJql` | devplan (optional enrichment), agents |
| `[OP: get_confluence]` | `getConfluencePage` | imbas-analyst (validate references) |
| `[OP: search_confluence]` | `searchConfluenceUsingCql` | imbas-analyst (related context) |

## Agent tool grants (v0.2.0)

As of v0.2.0, agent `tools:` frontmatter no longer includes Jira/Atlassian
tools. Agents interact with Jira through `[OP:]` semantic operations
declared in skill workflows. The LLM resolves the appropriate tool at
runtime based on the session's available tools.

Current baseline is pinned in
`packages/imbas/scripts/baselines/agent-tools-frontmatter.json` and
verified by `scripts/check-agent-tools-frontmatter.mjs`.
