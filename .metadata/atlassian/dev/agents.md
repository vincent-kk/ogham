# Agents

> **Type**: [DEV] Development mapping  
> **Date**: 2026-04-13  
> **Spec Reference**: `/Users/Vincent/Workspace/mcp-atlassian/.docs/.spec/agents.md`

---

## 1. Agent Layer Overview

Agents are **domain experts** spawned by the Dispatcher (Claude Code main agent) for complex workflows. Each Agent:
- Embeds domain knowledge (field formatting, workflow rules, error recovery strategies)
- Orchestrates multiple Skill calls to complete a task
- Is environment-agnostic — Cloud/Server branching is handled by lower layers

**When to spawn vs. direct Skill use**:
- **Simple tasks** (single issue lookup, page read): Dispatcher uses Skill directly, no Agent spawn
- **Complex workflows** (cross-domain coordination, multi-step operations, error recovery): Dispatcher spawns the appropriate Agent

### Agent Selection Criteria

| Signal | Routing Target | Example |
|---|---|---|
| Keywords: issue, ticket, JQL, sprint, board, epic, worklog, SLA | **Jira Agent** | "PROJ-123 이슈 상태 변경해줘" |
| Keywords: page, space, CQL, wiki, document, attachment | **Confluence Agent** | "개발 스페이스에 회의록 작성해줘" |
| Pattern: `[A-Z]+-\d+` (issue key) | **Jira Agent** | "PROJ-456 코멘트 추가" |
| Pattern: numeric ID + "page" context | **Confluence Agent** | "페이지 12345 업데이트" |
| Both domains mentioned | **Cross-domain** (sequential/parallel) | "Jira 이슈 목록을 Confluence에 정리" |
| Auth/setup related | **atlassian-setup Skill** (direct) | "연결 상태 확인해줘" |

**Priority**: Explicit domain keyword > Identifier pattern > Context inference. When ambiguous, ask the user.

### Cross-domain Coordination Patterns

| Pattern | Use Case | Example |
|---|---|---|
| **Sequential** | One Agent's output feeds another | Jira search → Confluence page creation |
| **Parallel** | Independent information gathering | Project info + Space pages simultaneously |
| **Pipeline** | Multi-stage transformation | Sprint data → format → Confluence weekly report |
| **Conditional** | Depends on first result | Check Jira remote links → if Confluence URL exists, read page |

---

## 2. Jira Agent

### Agent Definition File: `agents/jira.md`

#### Domain Scope

Based on 22 original Python mixins, covering these domains:

| Category | Capabilities | Original Mixins |
|---|---|---|
| **Issues** | CRUD, bulk create, changelog, delete | `IssuesMixin` |
| **Search** | JQL (Cloud v3 POST / Server v2 GET), field search | `SearchMixin` |
| **Projects** | Project list, issue type metadata, components, versions | `ProjectsMixin` |
| **Comments** | CRUD, JSM comments (Server/DC dedicated API) | `CommentsMixin` |
| **Transitions** | State transitions, available transition queries | `TransitionsMixin` |
| **Agile** | Boards, sprints, epic management | `BoardsMixin`, `SprintsMixin`, `EpicsMixin` |
| **Service Management** | SLA, queues, ProForma forms | `SLAMixin`, `QueuesMixin`, `FormsMixin`, `FormsApiMixin` |
| **Fields** | Field metadata, custom field options (Cloud) | `FieldsMixin`, `FieldOptionsMixin` |
| **Links** | Issue links, remote links | `LinksMixin` |
| **Watchers** | Issue watcher list | `WatchersMixin` |
| **Worklog** | Time logging | `WorklogMixin` |
| **Attachments** | Download, image retrieval | `AttachmentsMixin` |
| **Users** | Profile, account ID lookup | `UsersMixin` |
| **Development** | Branch, commit, PR info | `DevelopmentMixin` |
| **Metrics** | Cycle time, status duration (changelog-based) | `MetricsMixin` |
| **Formatting** | ADF/Wiki markup conversion | `FormattingMixin` |

#### Available Skills

| Skill | Purpose |
|---|---|
| `atlassian-jira` | Jira API domain router (15 tool domains) |
| `atlassian-setup` | Auth/connection management |
| `atlassian-download` | Attachment download |

#### Domain Knowledge

**ADF vs Wiki Markup branching**:
```
if is_cloud:
    content_format = "adf"    # Markdown -> ADF auto-conversion
else:
    content_format = "wiki"   # Markdown -> Wiki markup conversion
```
Agent always receives user input as Markdown; Skill handles conversion.

**Issue creation field formatting rules**:
1. Required fields: `project`, `issuetype`, `summary` — must always be present
2. Custom fields: `customfield_XXXXX` format — fetch field metadata first to verify correct value format
3. User fields: Cloud uses `accountId`, Server/DC uses `name` or `key`
4. Date fields: ISO 8601 (`YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss.sssZ`)
5. Select fields: `{ "value": "option" }` or `{ "id": "optionId" }` object format
6. Multi-select: Array of above objects

**State transition rules**:
1. Always query available transitions first via `getTransitionsForJiraIssue`
2. If requested state not in available list → suggest closest available states
3. If transition requires fields (e.g., resolution) → auto-detect and ask user
4. **Never directly set status field** — must always use transition API

**Cloud vs Server/DC differences**:

| Aspect | Cloud | Server/DC |
|---|---|---|
| Search API | v3 POST `/rest/api/3/search/jql` | v2 GET `/rest/api/2/search` |
| Content format | ADF (JSON) | Wiki markup (text) |
| User ID | `accountId` | `name` / `key` |
| Custom field options | Field Options API available | Not available |
| JSM comments | Standard comment API | Dedicated API required |
| Development Info | DevInfo API | REST-based query |

#### Error Handling Strategy

| Error | Analysis | Agent Action |
|---|---|---|
| 404 Issue Not Found | Project key validity check | JQL fallback search |
| 400 Field Error | Parse error message | Fetch field metadata via `getIssueTypeMetaWithFields` → retry |
| 403 Permission | Insufficient access | Inform user of required permissions, suggest alternatives |
| Transition failure | Invalid transition path | Query available transitions, suggest nearest valid path |

#### Permission Boundaries

**Allowed** (autonomous execution):
- Issue CRUD, comments, worklogs, state transitions
- Sprint management, issue link create/delete
- JQL search, field metadata queries, attachment download
- Custom field value setting (after metadata verification)

**Denied** (refuse to perform):
- Workflow scheme changes, project create/delete
- User permission changes, global settings
- Bulk delete (>10 items), issue type scheme changes
- Attachment upload (Jira — current limitation)

**Confirm first** (require user approval):
- Single issue delete
- Bulk create (>5 items — show list)
- Sprint start/complete
- Version release

---

## 3. Confluence Agent

### Agent Definition File: `agents/confluence.md`

#### Domain Scope

Based on 8 original Python mixins:

| Category | Capabilities | Original Mixins |
|---|---|---|
| **Pages** | CRUD, hierarchy, tree, move, version history, diff | `PagesMixin` |
| **Search** | CQL content search, user search | `SearchMixin` |
| **Spaces** | Space listing, filtering | `SpacesMixin` |
| **Comments** | Footer, inline (Cloud), threaded reply | `CommentsMixin` |
| **Labels** | Page label query/addition | `LabelsMixin` |
| **Attachments** | Upload (single/multi), download, delete, images, V1/V2 | `AttachmentsMixin` |
| **Analytics** | Page view count (Cloud only) | `AnalyticsMixin` |
| **Users** | Current user, user search | `UsersMixin` |

#### Available Skills

| Skill | Purpose |
|---|---|
| `atlassian-confluence` | Confluence API domain router (8 tool domains) |
| `atlassian-setup` | Auth/connection management |
| `atlassian-download` | Attachment download |

#### Domain Knowledge

**Storage Format**:
- Confluence page body is stored as Storage Format (XHTML-based)
- Agent receives Markdown input → Skill converts to Storage Format → MCP sends to API
- Storage Format requires strict XHTML rules — unclosed or improperly nested tags cause API errors

**Version management rules**:
- `version.number` is **mandatory** for page updates
- Always: fetch current page → get `version.number` → send `version.number + 1` in update
- On 409 conflict → re-fetch latest version → retry (max 3 times)

**V1 vs V2 API branching**:

| Feature | V1 API | V2 API | Notes |
|---|---|---|---|
| Page CRUD | `/rest/api/content/{id}` | `/api/v2/pages/{id}` | V2 preferred on Cloud |
| Inline comments | Not supported | Supported | Cloud only |
| Analytics | Not supported | Supported | Cloud only |
| Attachments | V1 only on Server | V1 + V2 on Cloud | V2 has improved metadata |
| Page move | V1 only | Not supported in V2 | V2 exception |

Skill auto-selects V2 when available. Agent does not specify API version directly.

**Cloud vs Server/DC differences**:

| Aspect | Cloud | Server/DC |
|---|---|---|
| Inline comments | Supported | Not supported |
| Analytics (views) | Supported | Not supported |
| V2 API | Available | Not available |
| Attachment API | V1 + V2 | V1 only |
| User ID | `accountId` | `userKey` / `username` |

#### Error Handling Strategy

Base patterns same as Jira Agent, plus Confluence-specific errors:

| Error | Confluence-specific Cause | Agent Action |
|---|---|---|
| 409 Conflict | Version conflict (concurrent edit) | Re-fetch latest version number → retry (max 3) |
| 400 Bad Request | Storage Format error (invalid XHTML) | Validate content → fix broken tags → retry or report |
| 404 Not Found | Page/space does not exist | CQL search for similar pages as suggestion |
| 413 Payload Too Large | Attachment exceeds size limit | Report server limit, suggest file splitting |

#### Permission Boundaries

**Allowed** (autonomous execution):
- Page CRUD, comments (footer/inline/reply), labels
- CQL search, attachment upload/download/delete
- Page move (within same space), page tree/hierarchy
- Version history and diff

**Denied** (refuse to perform):
- Space create/delete, space permission changes
- Global template management, user management
- App/plugin configuration

**Confirm first** (require user approval):
- Page delete (especially with child pages)
- Cross-space page move
- Bulk attachment upload (>5 files)
- Page rollback to previous version

---

## 4. Agent Common Conventions

### Input/Output Interface

#### Agent Input (Dispatcher -> Agent)

```typescript
interface AgentRequest {
  action: string;
  params: Record<string, unknown>;
  context: {
    previous_results?: AgentResponse[];  // Pipeline pattern
    preferences?: {
      language?: string;
      detail_level?: "brief" | "normal" | "verbose";
    };
    environment?: {     // Pass-through to Skill — Agent does not use directly
      is_cloud: boolean;
      base_url: string;
    };
  };
}
```

#### Agent Output (Agent -> Dispatcher)

```typescript
interface AgentResponse {
  success: boolean;
  data?: unknown;
  error?: {
    code: string;           // e.g., "AUTH_FAILED", "NOT_FOUND"
    message: string;
    http_status?: number;
    retryable: boolean;
    details?: unknown;
  };
  metadata?: {
    duration_ms: number;
    api_calls: number;
    warnings?: string[];
  };
}
```

### Skill Call Protocol

Agents NEVER call MCP tools directly. Always through Skills:

```
Agent -> Skill -> MCP Tool -> Atlassian API
```

**Rules**:
1. **Parameter injection**: Skill auto-injects environment info. Agent passes only business parameters.
2. **Format conversion**: Skill handles Markdown → ADF/Storage/Wiki, user identifier conversion.
3. **Response normalization**: Skill normalizes raw MCP response before returning to Agent.
4. **Error wrapping**: MCP errors are wrapped into `AgentResponse.error` format.

### Error Propagation

| Error Source | Dispatcher Action |
|---|---|
| Single Agent failure (non-critical) | Partial response from successful Agent, mention failure |
| Single Agent failure (critical) | Forward error to user, ask about retry |
| Cross-domain sequential failure | Stop pipeline, preserve completed steps, report |
| All Agents fail | Check auth status, provide specific error info |
| Timeout | Per-Agent 30s default, return partial results on timeout |

**Recovery rules**:
- Auto-retry only for transient errors (429, 503)
- Auth errors (401): trigger atlassian-setup reauth → retry once
- Data mutation operations (POST/PUT/DELETE): NO auto-retry (idempotency not guaranteed)
