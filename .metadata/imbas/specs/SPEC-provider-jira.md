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

| Provider Operation | REST Endpoint | Used By |
|--------------------|---------------|---------|
| `[OP: create_issue]` | `POST /rest/api/3/issue` | manifest |
| `[OP: create_link]` | `POST /rest/api/3/issueLink` | manifest |
| `[OP: get_issue]` | `GET /rest/api/3/issue/{key}` | split, devplan, `imbas:read-issue` |
| `[OP: edit_issue]` | `PUT /rest/api/3/issue/{key}` | manifest (horizontal split) |
| `[OP: search_jql]` | `POST /rest/api/3/search/jql` | split, devplan, cache |
| `[OP: add_comment]` | `POST /rest/api/3/issue/{key}/comment` | manifest (feedback), digest |
| `[OP: get_transitions]` | `GET /rest/api/3/issue/{key}/transitions` | manifest |
| `[OP: transition_issue]` | `POST /rest/api/3/issue/{key}/transitions` | manifest |

### 3.2 Required — Setup & Cache (5)

| Provider Operation | REST Endpoint | Used By |
|--------------------|---------------|---------|
| `[OP: auth_check]` | `GET /rest/api/3/myself` | setup (health check) |
| `[OP: get_projects]` | `GET /rest/api/3/project` | setup |
| `[OP: get_issue_types]` | `GET /rest/api/3/issuetype/project?projectId={id}` | setup, cache |
| `[OP: get_issue_type_fields]` | `GET /rest/api/3/issue/createmeta/{projectKey}/issuetypes/{issueTypeId}` | setup, cache |
| `[OP: get_link_types]` | `GET /rest/api/3/issueLinkType` | setup, cache |

### 3.3 Optional — Document Source (3)

| Provider Operation | REST Endpoint | Condition |
|--------------------|---------------|-----------|
| `[OP: get_confluence]` | `GET /wiki/api/v2/pages/{id}?body-format=storage` | When source is Confluence URL |
| `[OP: search_confluence]` | `GET /wiki/rest/api/content/search?cql=...` | Related spec search |
| `[OP: fetch_attachment]` | `GET /rest/api/3/attachment/content/{id}` | Attachment download |

The LLM resolves each `[OP:]` to an available session tool at runtime. REST endpoints
serve as fallback for generic HTTP tools when no dedicated tool is available.

---

## 4. Execution Patterns

### 4.1 Issue Creation

```
for each item in manifest where status == "pending":
  1. [OP: create_issue] project=KEY, type=<type>, summary=<summary>, description=<desc>, parent=<key?>
     REST: POST /rest/api/3/issue
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
    3. [OP: create_link] type=<linkType>, inward=<from>, outward=<to>
       REST: POST /rest/api/3/issueLink
  link.status = "created"
  save manifest
```

### 4.3 State Transition

```
1. [OP: get_transitions] issue_ref → available transitions
   REST: GET /rest/api/3/issue/{key}/transitions
2. Find transition matching target state
3. [OP: transition_issue] issue_ref, transitionId
   REST: POST /rest/api/3/issue/{key}/transitions
```

Note: Jira workflow may restrict transitions. If target transition unavailable → error + user guidance.

### 4.4 Cache Refresh

```
1. Check cached_at.json TTL
2. If expired:
   a. [OP: get_projects] → project-meta.json
   b. [OP: get_issue_types] project=KEY → base types
   c. [OP: get_issue_type_fields] per type → issue-types.json
   d. [OP: get_link_types] → link-types.json
   e. Update cached_at.json
```

---

## 5. Access Control

### 5.1 By Skill

| Skill | Read Operations | Write Operations |
|-------|----------------|-----------------|
| setup | `auth_check`, `get_projects`, `get_issue_types`, `get_issue_type_fields`, `get_link_types` | (none) |
| validate | `get_confluence`, `search_confluence`, `get_issue` | (none) |
| split | `get_issue`, `search_jql` | (none — manifest only) |
| devplan | `get_issue`, `search_jql` | (none — manifest only) |
| manifest | `get_issue`, `get_transitions` | `create_issue`, `create_link`, `edit_issue`, `transition_issue`, `add_comment` |
| `imbas:fetch-media` | `get_confluence`, `fetch_attachment` | (none) |
| digest | (via `imbas:read-issue`) | `add_comment` |
| `imbas:read-issue` | `get_issue` | (none) |

### 5.2 By Agent

| Agent | Read Operations | Write Operations | Notes |
|-------|----------------|-----------------|-------|
| imbas-analyst | `get_confluence`, `search_confluence`, `get_issue`, `search_jql` | (none) | Validation + reverse inference |
| imbas-planner | `search_jql`, `get_issue` | (none) | Skill controls via prompt |
| imbas-engineer | `get_issue`, `search_jql` | (none) | Skill controls via prompt |

> **Note (v0.2.0)**: Agent `tools:` frontmatter no longer includes provider-specific
> tool names. Agents interact with Jira through `[OP:]` semantic operations declared
> in skill workflows. The LLM resolves to available session tools at runtime.
> REST endpoints serve as fallback — see §3 for the mapping.

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
4. **Workflow transitions**: Not all transitions are always available. Check `[OP: get_transitions]` first.

---

## Related

- [SPEC-provider.md](./SPEC-provider.md) — Abstract provider interface
- [SPEC-provider-github.md](./SPEC-provider-github.md) — GitHub provider comparison
- [SPEC-state.md](./SPEC-state.md) — Config & state schemas
- [SPEC-skills.md](./SPEC-skills.md) — Provider를 호출하는 스킬 정의
- [SPEC-tools.md](./SPEC-tools.md) — imbas MCP 도구 정의
- [BLUEPRINT.md](../BLUEPRINT.md) — Architecture overview
