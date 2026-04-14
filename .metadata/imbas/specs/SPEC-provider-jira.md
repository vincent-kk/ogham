# SPEC-provider-jira — Jira Provider Implementation

> Status: Draft v1.0 (2026-04-04)
> Parent: [SPEC-provider.md](./SPEC-provider.md)
> Supersedes: [SPEC-atlassian-tools.md](./SPEC-atlassian-tools.md) (deprecated)

---

## 1. Overview

Jira provider implementation for imbas. Uses Atlassian MCP server tools for all operations.

### Prerequisites

- A Jira-capable tool available in the session (Atlassian Cloud MCP, on-premise MCP, or custom plugin)
- Jira project access (issue create, edit, transition)

---

## 2. Concept Mapping

| imbas Concept | Jira Representation | Native Support |
|---------------|---------------------|----------------|
| **Epic** | Epic issue type | ✅ Native hierarchy |
| **Story** | Story issue type | ✅ Native |
| **Task** | Task issue type | ✅ Native |
| **Subtask** | Sub-task issue type | ✅ Native (parent field) |
| **Bug** | Bug issue type | ✅ Native |
| **Workflow States** | Jira Workflow transitions | ✅ Native (with guards) |
| **Links** | Issue Links (typed) | ✅ Native |

---

## 3. Tool Inventory

> **Semantic Operations (v0.2.0)**: Skill workflows and agent prompts reference
> Jira operations via `[OP:]` notation instead of concrete tool names. The LLM
> resolves which tool to use at runtime. The table below maps provider operations
> to their Jira tool implementations for reference.

### 3.1 Required — Core Workflow (8)

| Tool | Provider Operation | Used By |
|------|--------------------|---------|
| `createJiraIssue` | `create_issue` | manifest |
| `createIssueLink` | `create_link` | manifest |
| `getJiraIssue` | `get_issue` | split, devplan, `imbas:read-issue` |
| `editJiraIssue` | `edit_issue` | manifest (horizontal split) |
| `searchJiraIssuesUsingJql` | `search_issues` | split, devplan, cache |
| `addCommentToJiraIssue` | `add_comment` | manifest (feedback), digest |
| `getTransitionsForJiraIssue` | `get_transitions` | manifest |
| `transitionJiraIssue` | `transition_issue` | manifest |

### 3.2 Required — Setup & Cache (4)

| Tool | Provider Operation | Used By |
|------|--------------------|---------|
| `getVisibleJiraProjects` | `get_project_meta` | setup |
| `getJiraProjectIssueTypesMetadata` | `get_issue_types` | setup, cache |
| `getJiraIssueTypeMetaWithFields` | `get_issue_types` (detail) | setup, cache |
| `getIssueLinkTypes` | `get_link_types` | setup, cache |

### 3.3 Optional — Document Source (3)

| Tool | Used By | Condition |
|------|---------|-----------|
| `getConfluencePage` | validate, `imbas:fetch-media` | When source is Confluence URL |
| `searchConfluenceUsingCql` | validate (analyst) | Related spec search |
| `fetchAtlassian` | `imbas:fetch-media` | Attachment download |

### 3.4 Excluded (15)

| Tool | Reason |
|------|--------|
| `createConfluencePage` | imbas doesn't write to Confluence |
| `updateConfluencePage` | Same |
| `getConfluenceSpaces` | Not needed |
| `lookupJiraAccountId` | imbas doesn't assign users |
| `addWorklogToJiraIssue` | Out of scope |
| `atlassianUserInfo` | Not needed |
| `getAccessibleAtlassianResources` | Handled by MCP init |
| `getConfluencePageDescendants` | Not needed |
| `getConfluencePageFooterComments` | Not needed |
| `getConfluencePageInlineComments` | Not needed |
| `getConfluenceCommentChildren` | Not needed |
| `createConfluenceFooterComment` | Not needed |
| `createConfluenceInlineComment` | Not needed |
| `getPagesInConfluenceSpace` | Not needed |
| `getJiraIssueRemoteIssueLinks` | Not needed |
| `searchAtlassian` | Rovo — use CQL/JQL instead |

---

## 4. Execution Patterns

### 4.1 Issue Creation

```
for each item in manifest where status == "pending":
  1. createJiraIssue(project, type, summary, description, parent?)
  2. item.issue_ref = result.key    // "PROJ-123"
  3. item.status = "created"
  4. save manifest (immediate — crash recovery)
```

### 4.2 Link Creation

```
for each link in manifest.links where status == "pending":
  for each target in link.to:     // 1:N for horizontal split
    1. resolve link.from → issue_ref
    2. resolve target → issue_ref
    3. createIssueLink(type, inwardIssue, outwardIssue)
  link.status = "created"
  save manifest
```

### 4.3 State Transition

```
1. getTransitionsForJiraIssue(issue_ref) → available transitions
2. Find transition matching target state
3. transitionJiraIssue(issue_ref, transitionId)
```

Note: Jira workflow may restrict transitions. If target transition unavailable → error + user guidance.

### 4.4 Cache Refresh

```
1. Check cached_at.json TTL
2. If expired:
   a. getVisibleJiraProjects → project-meta.json
   b. getJiraProjectIssueTypesMetadata(key) → base types
   c. getJiraIssueTypeMetaWithFields(per type) → issue-types.json
   d. getIssueLinkTypes → link-types.json
   e. Update cached_at.json
```

---

## 5. Access Control

### 5.1 By Skill

| Skill | Read Tools | Write Tools |
|-------|-----------|-------------|
| setup | getVisibleJiraProjects, getJiraProjectIssueTypesMetadata, getJiraIssueTypeMetaWithFields, getIssueLinkTypes | (none) |
| validate | getConfluencePage, searchConfluenceUsingCql, getJiraIssue | (none) |
| split | getJiraIssue, searchJiraIssuesUsingJql | (none — manifest only) |
| devplan | getJiraIssue, searchJiraIssuesUsingJql | (none — manifest only) |
| manifest | getJiraIssue, getTransitionsForJiraIssue | createJiraIssue, createIssueLink, editJiraIssue, transitionJiraIssue, addCommentToJiraIssue |
| `imbas:fetch-media` | getConfluencePage, fetchAtlassian | (none) |
| digest | (via `imbas:read-issue`) | addCommentToJiraIssue |
| `imbas:read-issue` | getJiraIssue | (none) |

### 5.2 By Agent

| Agent | Read Tools | Write Tools | Notes |
|-------|-----------|-------------|-------|
| imbas-analyst | getConfluencePage, searchConfluenceUsingCql, getJiraIssue, searchJiraIssuesUsingJql | (none) | Validation + reverse inference |
| imbas-planner | searchJiraIssuesUsingJql, getJiraIssue | (none) | Skill controls via prompt |
| imbas-engineer | getJiraIssue, searchJiraIssuesUsingJql | (none) | Skill controls via prompt |
| ~~imbas-media~~ | — | — | *migrated to `@ogham/atlassian`* |

> **Note (v0.2.0)**: Agent `tools:` frontmatter no longer includes Atlassian MCP
> tools. Agents interact with Jira through `[OP:]` semantic operations declared
> in skill workflows. The LLM selects the appropriate tool at runtime.

---

## 6. Jira-Specific Config

```json
{
  "jira": {
    "issue_types": {
      "epic": "Epic",
      "story": "Story",
      "task": "Task",
      "subtask": "Sub-task",
      "bug": "Bug"
    },
    "workflow_states": {
      "todo": "To Do",
      "ready_for_dev": "Ready for Dev",
      "in_progress": "In Progress",
      "in_review": "In Review",
      "done": "Done"
    },
    "link_types": {
      "blocks": "Blocks",
      "split_into": "is split into",
      "split_from": "split from",
      "relates_to": "relates to"
    }
  }
}
```

All values are configurable — different Jira instances may have different type/state/link names.

---

## 7. Quirks & Notes

1. **Confluence page update version**: When using `updateConfluencePage`, version parameter must be **current version + 1**. Same version returns success but doesn't apply.
2. **Custom fields**: Epic Name field (`customfield_10011`) varies by Jira instance. Cache during setup.
3. **Subtask creation**: Requires `parent` field (parent issue key). Jira enforces this natively.
4. **Workflow transitions**: Not all transitions are always available. Check `getTransitionsForJiraIssue` first.

---

## Related

- [SPEC-provider.md](./SPEC-provider.md) — Abstract provider interface
- [SPEC-provider-github.md](./SPEC-provider-github.md) — GitHub provider comparison
- [SPEC-state.md](./SPEC-state.md) — Config & state schemas
- [SPEC-skills.md](./SPEC-skills.md) — Provider를 호출하는 스킬 정의
- [SPEC-tools.md](./SPEC-tools.md) — imbas MCP 도구 정의
- [BLUEPRINT.md](../BLUEPRINT.md) — Architecture overview
