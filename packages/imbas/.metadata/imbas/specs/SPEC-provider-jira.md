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
subdirectory is either not provider-aware (e.g. `pipeline`, `fetch-media`)
or has divergence below the 15-line threshold and handles Jira through
inline branching in a flat file.

Currently partitioned skills (RALPLAN v2 Phase C1-C5):
- `skills/manifest/references/jira/{workflow,tools,errors}.md`
- `skills/read-issue/references/jira/{workflow,tools,errors}.md`
- `skills/digest/references/jira/{workflow,tools,errors}.md`
- `skills/devplan/references/jira/{workflow,tools,errors}.md`

## Network path

Every Jira API call goes through the `atlassian` MCP server registered in
`packages/imbas/.mcp.json`. imbas TypeScript code has no HTTP client for
Jira and MUST NOT acquire one — that would invert the LLM-orchestrated
architecture invariant in `BLUEPRINT.md`.

## Tool surface

| Tool | Used by |
|------|---------|
| `mcp__plugin_imbas_atlassian__createJiraIssue` | manifest (batch create) |
| `mcp__plugin_imbas_atlassian__createIssueLink` | manifest (link creation, including 1:N expansion) |
| `mcp__plugin_imbas_atlassian__addCommentToJiraIssue` | manifest (feedback comments), digest (publish) |
| `mcp__plugin_imbas_atlassian__transitionJiraIssue` | manifest (split-source Story Done), digest (suggestion trigger upstream) |
| `mcp__plugin_imbas_atlassian__getJiraIssue` | read-issue, devplan (optional), manifest (drift check) |
| `mcp__plugin_imbas_atlassian__searchJiraIssuesUsingJql` | devplan (optional enrichment), agents |
| `mcp__plugin_imbas_atlassian__getConfluencePage` | imbas-analyst (validate references) |
| `mcp__plugin_imbas_atlassian__searchConfluenceUsingCql` | imbas-analyst (related context) |

## Agent tool grants

All three imbas agents (`imbas-planner`, `imbas-engineer`, `imbas-analyst`)
carry at least some of the Atlassian tools in their `tools:` frontmatter.
In local mode these grants become inert (the skill workflow directs the
agent to file-based operations only) but the grants remain in place.
Hard enforcement via per-provider agent files is a tracked follow-up
(see `SPEC-provider.md` Option D).

Current baseline is pinned in
`packages/imbas/scripts/baselines/agent-tools-frontmatter.json` and
verified by `scripts/check-agent-tools-frontmatter.mjs`.
