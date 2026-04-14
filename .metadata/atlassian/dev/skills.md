# Skills

> **Type**: [DEV] Development mapping  
> **Date**: 2026-04-13  
> **Spec Reference**: `/Users/Vincent/Workspace/mcp-atlassian/.docs/.spec/skills.md`

---

## 1. Skill Layer Overview

Skills are **API spec capsules** that bridge Agents and MCP tools. Each Skill:
- Embeds endpoint URLs, header specs, body schemas for a specific Atlassian API domain
- Transforms Agent intent into MCP tool calls with correct parameters
- Is stateless — a pure function that returns `(method, endpoint, params, body)` tuples

### Lazy Reference Loading Pattern

```
SKILL.md (always loaded)
  -> Tool catalog with one-line descriptions
  -> Error handling reference
  -> Permission boundaries

tools/<domain>/schema.md (loaded on-demand)
  -> Endpoint details, parameter specs, Cloud/Server branching
  -> Only loaded when the LLM decides to use that specific tool
```

This pattern ensures SKILL.md stays lightweight (~token-efficient) while `tools/` subdirectories provide deep reference only when needed.

---

## 2. atlassian-setup

> **Spec Reference**: `/Users/Vincent/Workspace/mcp-atlassian/.docs/.spec/skills.md` Section 2

### Purpose

Authentication and connection configuration. Prerequisite for all other Skills.

### SKILL.md Content Outline

```
- Skill name: atlassian-setup
- Domain: common
- MCP tools used: setup (local web server)
- Description: Atlassian authentication and connection management
```

### Auth Types

| Auth Method | Cloud | Server/DC | Config Value |
|---|---|---|---|
| Basic Auth | email + API token | username + password | `auth_type: "basic"` |
| PAT | — | token | `auth_type: "pat"` |
| OAuth 2.0 (3LO) | cloud_id + tokens | base_url + tokens | `auth_type: "oauth"` |

### Config Schema

```yaml
connection:
  url: "https://mysite.atlassian.net"   # Required
  auth_type: "basic"                     # Required: basic | pat | oauth
  username: "user@example.com"           # Required for basic

options:
  ssl_verify: true          # Default: true
  timeout: 75               # Default: 75s
  spaces_filter: "DEV,TEAM" # Optional: Confluence space filter
  http_proxy: null           # Optional
  https_proxy: null          # Optional
  custom_headers: {}         # Optional
```

### Setup Flow

```
1. Atlassian instance URL input
2. URL analysis -> Cloud(atlassian.net) / Server/DC auto-detection
3. Auth method suggestion:
   - Cloud -> Basic(email+token) or OAuth 2.0
   - Server/DC -> Basic, PAT, or OAuth 2.0
4. Credential input -> save to plugin secure storage
5. Connection test (Jira: /rest/api/*/myself, Confluence: /rest/api/user/current)
6. Success -> finalize, Failure -> retry guidance
```

### 401 Recovery

- On HTTP 401 during any Skill execution -> trigger MCP auth form
- OAuth 2.0: attempt refresh token first -> fail -> show auth form
- After re-auth -> retry original request once

### references/ Structure

```
skills/atlassian-setup/
  SKILL.md
  references/
    auth-types.md        # Detailed auth type comparison
    setup-flow.md        # Step-by-step setup wizard
    errors.md            # Setup-specific error handling
```

---

## 3. atlassian-download

> **Spec Reference**: `/Users/Vincent/Workspace/mcp-atlassian/.docs/.spec/skills.md` Section 5

### Purpose

Unified attachment download for both Jira and Confluence.

### SKILL.md Content Outline

```
- Skill name: atlassian-download
- Domain: common
- MCP tools used: get
- Description: Download attachments and images from Jira issues and Confluence pages
```

### Operations

| Operation | MCP Tool | Description |
|---|---|---|
| `download_attachment` | `get` | Download attachment by URL or issue_key/page_id + filename |
| `get_images` | `get` | Retrieve image attachment metadata |

### Download Flow

```
1. Resolve attachment URL (direct URL or metadata lookup)
2. Auth header constructed (from auth-setup config)
3. HTTP GET request (streaming)
4. Save to file (target_path or temp directory)
5. Return: file path, size, MIME type
```

### Multipart Upload Spec (shared reference for Jira/Confluence uploads)

```yaml
headers:
  X-Atlassian-Token: "nocheck"           # CSRF bypass (required)
  Content-Type: "multipart/form-data"    # Boundary auto-set
constraints:
  max_file_size: "50MB"
  mime_detection: "automatic"
```

### references/ Structure

```
skills/atlassian-download/
  SKILL.md
  references/
    download-flow.md     # Download and upload shared specs
    errors.md            # Download-specific errors
```

---

## 4. atlassian-jira

> **Spec Reference**: `/Users/Vincent/Workspace/mcp-atlassian/.docs/.spec/skills.md` Section 3, `agents.md` Section 2

### Purpose

Jira API domain router. SKILL.md provides the full tool catalog; `tools/` subdirectories provide detailed endpoint schemas loaded on-demand.

### SKILL.md Content Outline

The SKILL.md must include:

1. **Tool catalog** (15 domains) with one-line descriptions
2. **Error handling** section: HTTP status recovery strategies
3. **Permission boundaries**: allowed / denied / confirm-required

#### Tool Catalog (15 domains)

| Domain | One-line Description | MCP Tools |
|---|---|---|
| **issue** | Issue CRUD, bulk create, changelog | get, post, put, delete |
| **search** | JQL-based issue search (Cloud POST / Server GET) | get, post |
| **transition** | Issue workflow state transitions | get, post |
| **comment** | Issue comment CRUD + JSM comments | get, post |
| **agile** | Board, Sprint, Epic management | get, post, put |
| **project** | Project metadata, components, versions | get, post |
| **field** | Field metadata, custom field options | get |
| **link** | Issue links (internal + remote/external) | get, post, delete |
| **worklog** | Work time logging | get, post |
| **attachment** | Issue attachment upload/metadata | get, post |
| **user** | User search and profile lookup | get |
| **watcher** | Issue watcher management | get, post, delete |
| **jsm** | JSM SLA, queues, ProForma forms | get, put |
| **development-info** | Dev info (branch, commit, PR, build) | get |
| **metrics** | Issue time metrics (cycle time, status duration) | get |

#### Error Handling (SKILL.md section)

| HTTP Status | Cause | Recovery Strategy |
|---|---|---|
| **401** | Auth expired or invalid credentials | Trigger reauth via atlassian-setup -> retry once |
| **403** | Insufficient permissions | Report required permissions to user. No retry. |
| **404** | Issue/project not found | Verify identifier (typo check) -> report to user |
| **409** | Concurrent modification | Re-fetch latest data -> inform user of conflict |
| **429** | Rate limit exceeded | Exponential backoff (1s, 2s, 4s) max 3 retries |
| **400** | Field validation error | Parse error -> re-fetch field metadata -> retry with correct format or ask user |
| **500+** | Server-side failure | Retry once -> report to user on failure |

#### Permission Boundaries

**Allowed** (Agent can perform autonomously):
- Issue CRUD, comments, worklogs, state transitions
- Sprint management, issue link creation/deletion
- JQL search, field metadata queries, attachment download

**Denied** (Agent must refuse):
- Workflow scheme changes, project create/delete
- User permission changes, global settings
- Bulk delete (>10 items), issue type scheme changes
- Attachment upload (Jira — current MCP tool limitation)

**Confirm first** (User approval required):
- Single issue delete
- Bulk create (>5 items — show list for confirmation)
- Sprint start/complete, version release

### tools/ Subdirectory Structure

```
skills/atlassian-jira/
  SKILL.md
  tools/
    issue/
      schema.md              # Endpoints, params, Cloud/Server branching
      field-formatting.md    # Field formatting rules, ADF vs Wiki
      examples.md            # Call examples
    search/
      schema.md
      jql-guide.md           # JQL syntax reference
    transition/
      schema.md
    comment/
      schema.md
      jsm-comment.md         # JSM-specific comment handling
    agile/
      schema.md              # Board, Sprint, Epic unified
    project/
      schema.md
    field/
      schema.md
      custom-field-options.md  # Cloud-only field option API
    link/
      schema.md
    worklog/
      schema.md
    attachment/
      schema.md
    user/
      schema.md
    watcher/
      schema.md
    jsm/
      schema.md
      sla-calculation.md     # SLA working hours config
      forms.md               # ProForma form handling
    development-info/
      schema.md
    metrics/
      schema.md
```

### Key schema.md Content Patterns

Each `schema.md` follows a consistent structure:

```markdown
## Endpoints

| Operation | HTTP | Cloud Endpoint | Server Endpoint |
|---|---|---|---|

## Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|

## Cloud vs Server Branching

(Differences table)

## MCP Tool Mapping

| Operation | MCP Tool | Notes |
|---|---|---|

## Response Fields

(Key response fields and their meaning)
```

### Cloud vs Server Branching Summary

| Aspect | Cloud (v3) | Server/DC (v2) |
|---|---|---|
| API path | `/rest/api/3/issue` | `/rest/api/2/issue` |
| Description format | ADF (JSON) | Wiki markup (text) |
| Comment body | ADF | Plain text / wiki markup |
| User identifier | `accountId` | `name` or `key` |
| Search method | POST `/rest/api/3/search/jql` | GET `/rest/api/2/search` |
| Custom field options | Field Options API available | Not available |
| JSM comments | Standard comment API | Dedicated Service Desk API |

---

## 5. atlassian-confluence

> **Spec Reference**: `/Users/Vincent/Workspace/mcp-atlassian/.docs/.spec/skills.md` Section 4, `agents.md` Section 3

### Purpose

Confluence API domain router. Same lazy-loading pattern as atlassian-jira.

### SKILL.md Content Outline

1. **Tool catalog** (8 domains) with one-line descriptions
2. **Error handling** section
3. **Permission boundaries**

#### Tool Catalog (8 domains)

| Domain | One-line Description | MCP Tools |
|---|---|---|
| **page** | Page CRUD, hierarchy (ancestors/descendants), tree, move, version history, diff | get, post, put, delete |
| **search** | CQL-based content and user search | get |
| **space** | Space listing and filtering | get |
| **comment** | Footer comments, inline comments (Cloud), threaded replies | get, post |
| **attachment** | Upload (single/multi), download, delete, image retrieval, V1/V2 | get, post, delete |
| **label** | Page label query and addition | get, post |
| **analytics** | Page view statistics (Cloud only) | get |
| **user** | Current user, user search | get |

#### Error Handling (SKILL.md section)

| HTTP Status | Confluence-specific Cause | Recovery Strategy |
|---|---|---|
| **409** | Version conflict (concurrent edit) | Re-fetch latest version number -> update and retry (max 3) |
| **400** | Storage Format error (invalid XHTML) | Validate content -> fix broken tags -> retry or report to user |
| **404** | Page/space not found | CQL search for similar pages as suggestion |
| **413** | Attachment size exceeded | Report server limit, suggest file splitting |
| **401/403/429/500+** | Same as Jira (shared error patterns) | Same recovery strategies |

#### Permission Boundaries

**Allowed**:
- Page CRUD, comments (footer/inline/reply), labels
- CQL search, attachment upload/download/delete
- Page move (within same space), page tree/hierarchy queries
- Version history and diff

**Denied**:
- Space create/delete, space permission changes
- Global template management, user management
- App/plugin configuration

**Confirm first**:
- Page delete (especially when child pages exist)
- Cross-space page move
- Bulk attachment upload (>5 files)
- Page rollback to previous version

### tools/ Subdirectory Structure

```
skills/atlassian-confluence/
  SKILL.md
  tools/
    page/
      schema.md              # V1/V2 branching, CRUD endpoints
      hierarchy.md           # ancestors, descendants, page tree
      version.md             # Version management rules
    search/
      schema.md
      cql-guide.md           # CQL syntax reference
    space/
      schema.md
    comment/
      schema.md              # Footer, inline, reply handling
    attachment/
      schema.md              # Upload/download, V1/V2 branching
    label/
      schema.md
    analytics/
      schema.md              # Cloud-only page view stats
    user/
      schema.md
```

### V1 vs V2 API Branching

| Feature | V1 API | V2 API | Notes |
|---|---|---|---|
| Page CRUD | `/rest/api/content/{id}` | `/api/v2/pages/{id}` | V2 preferred on Cloud |
| Inline comments | Not supported | `/api/v2/inline-comments` | Cloud only |
| Attachments | `/rest/api/content/{id}/child/attachment` | `/api/v2/pages/{id}/attachments` | V2 has improved metadata |
| Page properties | `/rest/api/content/{id}/property` | `/api/v2/pages/{id}/properties` | |
| Analytics | `/wiki/rest/api/analytics/content/{id}/views` | — | Cloud only (V1 path) |
| Page move | `/rest/api/content/{id}/move/{position}` | Same (V1 only) | V2 exception |

**Selection rule**: Skill auto-selects V2 when available on Cloud, falls back to V1 on Server/DC or when V2 endpoint doesn't exist.

### Version Management Rules

Confluence page updates require `version.number` as a **mandatory parameter**:

```
1. Always fetch current page first -> get latest version.number
2. New version = current version + 1
3. On 409 conflict -> re-fetch -> retry (max 3 times)
```

### Cloud vs Server Branching Summary

| Aspect | Cloud | Server/DC |
|---|---|---|
| Inline comments | Supported | Not supported |
| Analytics (views) | Supported | Not supported |
| V2 API | Available | Not available |
| Attachment API | V1 + V2 | V1 only |
| User identifier | `accountId` | `userKey` / `username` |

---

## 6. Skill Interface Contract

### Input (Agent -> Skill)

```typescript
interface SkillRequest {
  skill: string;                       // e.g., "jira-issue"
  operation: "GET" | "POST" | "PUT" | "DELETE";
  params: Record<string, any>;         // Skill-specific parameters
  context?: {
    is_cloud: boolean;
    base_url: string;
  };
}
```

### Output (Skill -> MCP)

```typescript
interface McpToolCall {
  tool: "get" | "post" | "put" | "delete" | "convert";
  params: {
    endpoint: string;
    body?: object;
    query_params?: Record<string, string>;
    headers?: Record<string, string>;
    content_format?: "json" | "markdown";
    // ... tool-specific params
  };
}
```

### Cloud vs Server Branching Responsibility

Branching occurs in Skill and MCP layers only. Agent and Dispatcher are environment-agnostic.

| Branching Item | Layer |
|---|---|
| API path (`/rest/api/3/` vs `/rest/api/2/`) | Skill |
| Confluence V1 vs V2 | Skill |
| User identifier (`accountId` vs `name`) | Skill |
| ADF vs Wiki vs Storage format | MCP (converter) |
| Auth method (Basic/PAT/OAuth) | MCP (auth manager) |
| `is_cloud` auto-detection | MCP (environment resolver) |
