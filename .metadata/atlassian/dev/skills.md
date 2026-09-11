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

### SKILL.md / .shared Split

```
skills/.shared/ (loaded by reference from every skill)
  error-handling.md     -> HTTP status -> recovery action table, including 401 recovery
  mcp-tools.md          -> fetch/convert/auth_check/setup/comment_thread params

SKILL.md (always loaded)
  -> Execution model (direct call vs. spawning the domain agent)
  -> Call contract (endpoint style, service tag, formatting rules, endpoint routing)
  -> Domain table with one-line descriptions
  -> Identity and deployment notes

tools/<domain>/schema.md (loaded on-demand)
  -> Endpoint, method, notes table for that domain only
  -> Only loaded when the LLM decides to use that specific tool
```

Content needed on every run lives in SKILL.md or in `.shared/mcp-tools.md`; content needed only on failure or in specific domains lives in `.shared/error-handling.md`, `tools/<domain>/schema.md`, or `comment/reply-plugin.md`.

Auth and error handling are no longer duplicated per skill; SKILL.md points to `.shared/error-handling.md` for 401 recovery, and the setup flow / `auth_check` response live in `setup/SKILL.md`. Endpoint routing rules live in each router's own SKILL.md (`jira/SKILL.md`, `confluence/SKILL.md`), not in a shared file.

---

## 2. setup

> **Spec Reference**: `/Users/Vincent/Workspace/mcp-atlassian/.docs/.spec/skills.md` Section 2

### Purpose

Authentication and connection configuration. Prerequisite for all other Skills.

### SKILL.md Content Outline

```
- Skill name: setup
- Domain: common
- MCP tools used: setup (local web server), auth_check
- Description: Atlassian authentication and connection management
```

### Auth Types

Two credential slots per site; the wizard chooses implicitly from whether a username is present.

| Auth Method | Cloud             | Server/DC             |
| ----------- | ----------------- | --------------------- |
| Basic       | email + API token | username + password   |
| Bearer PAT  | —                 | personal access token |

A username present -> Basic; a bare token with no username -> Bearer.

### Setup Flow

```
1. Atlassian instance URL input (browser wizard, 127.0.0.1)
2. auth_check first: not configured -> setup(mode: "new"); configured -> confirm, then setup(mode: "edit")
3. Credential input -> save to plugin secure storage
4. Wizard returns on Save & Close, or after 5 minutes idle
5. --test: auth_check(connection_test: true) -> report per-site success/message/latency, Jira user
```

### 401 Recovery

- Router skills (jira, confluence, download): on `error.reauth_required: true` -> ask the user -> invoke `/atlassian:setup` -> retry the original request once. No -> stop with a note on how to run setup later.
- No refresh-token step exists; there is nothing to refresh under Basic/PAT auth.

---

## 3. download

> **Spec Reference**: `/Users/Vincent/Workspace/mcp-atlassian/.docs/.spec/skills.md` Section 5

### Purpose

Unified attachment download for both Jira and Confluence. Download only — the `fetch` tool cannot send a file body, so upload is not supported by any skill.

### SKILL.md Content Outline

```
- Skill name: download
- Domain: common
- MCP tools used: fetch (method: "GET", accept_format: "raw")
- Description: Download attachments and images from Jira issues and Confluence pages
```

### Operations

One `fetch` call per file: `method: "GET"`, `accept_format: "raw"`, `save_to_path: ".temp/<namespace>/<filename>"`.

| Source                  | Namespace                               |
| ----------------------- | --------------------------------------- |
| Jira issue `KAN-27`     | `.temp/KAN-27/<filename>`               |
| Jira comment on it      | `.temp/KAN-27_comment-10110/<filename>` |
| Confluence page `12345` | `.temp/confluence-12345/<filename>`     |

Every call downloads afresh and overwrites the target; there is no download cache.

### Errors

401 -> `.shared/error-handling.md`. 403 -> the user lacks browse/view permission; no retry. 404 on a Server/DC rest attachment-content URL -> fall back to the `content` URL from issue metadata. Other statuses -> `.shared/error-handling.md`.

---

## 4. jira

> **Spec Reference**: `/Users/Vincent/Workspace/mcp-atlassian/.docs/.spec/skills.md` Section 3, `agents.md` Section 2

### Purpose

Jira API domain router. SKILL.md provides the execution model, call contract, and domain table; `tools/` subdirectories provide detailed endpoint schemas loaded on-demand.

### SKILL.md Content Outline

The SKILL.md includes:

1. **Execution model**: execute directly for single-call work; spawn the `jira` agent for bulk writes (>3 issues), cross-domain chains, or work needing field metadata first
2. **Call contract**: logical paths, markdown body conversion, rendered-field verification after heavy formatting, DC comment threading, error handling by reference
3. **Domain table** (15 domains) with one-line descriptions

#### Domain Table (15 domains)

| Domain             | Covers                                                                 |
| ------------------ | ---------------------------------------------------------------------- |
| `issue`            | Issue CRUD, bulk create, create/edit metadata, changelog, archive      |
| `search`           | JQL search — Cloud `POST /issue/search/jql` (routed), DC `GET /search` |
| `transition`       | Workflow transitions (never set `status` directly)                     |
| `comment`          | Comments CRUD, JSM internal/public comments, DC reply-plugin threads   |
| `agile`            | Boards, sprints, epics (`/rest/agile/1.0`, pass-through)               |
| `project`          | Projects, issue types, components, versions                            |
| `field`            | Field metadata, Cloud custom field options                             |
| `link`             | Issue links, remote links                                              |
| `worklog`          | Worklog list/add                                                       |
| `attachment`       | Attachment metadata; download via `download` skill; upload unsupported |
| `user`             | Current user, user search/lookup                                       |
| `watcher`          | Watcher list/add/remove                                                |
| `jsm`              | Service desk queues, requests, SLA                                     |
| `development-info` | Branches, commits, PRs linked to an issue                              |
| `metrics`          | Cycle/lead time from the changelog                                     |

### tools/ Subdirectory Structure

```
skills/jira/
  SKILL.md
  tools/
    issue/
      schema.md              # Endpoints, params, create/update body, field formatting rules (ADF vs Wiki)
    search/
      schema.md
    transition/
      schema.md
    comment/
      schema.md               # Comment CRUD, thread clues, JSM comments
      reply-plugin.md         # DC reply-plugin thread merging
    agile/
      schema.md               # Board, Sprint, Epic unified
    project/
      schema.md
    field/
      schema.md
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
    development-info/
      schema.md
    metrics/
      schema.md
```

### Key schema.md Content Pattern

Each `schema.md` is a single table over logical endpoints, not per-deployment columns:

```markdown
## <domain>

| Operation | Method | Endpoint | Notes |
| --------- | ------ | -------- | ----- |
```

Endpoints are written as logical paths (`/issue/{key}`, `/pages/{id}`) — `/rest/api/{2|3}` is never hardcoded in a schema; the MCP layer's endpoint-routing attaches the Cloud/Server prefix. Deployment-specific behavior (Cloud vs. DC differences) is folded into the `Notes` column of the same row, not a separate table.

---

## 5. confluence

> **Spec Reference**: `/Users/Vincent/Workspace/mcp-atlassian/.docs/.spec/skills.md` Section 4, `agents.md` Section 3

### Purpose

Confluence API domain router. Same on-demand `tools/` loading pattern as jira.

### SKILL.md Content Outline

1. **Execution model**: execute directly for single-call work; spawn the `confluence` agent for multi-page work, cross-domain chains, or repeated 409/400 recovery
2. **Call contract**: `service: "confluence"` required on every call, V2 logical paths with DC rewriting, V1 full-path operations, markdown body conversion, version-conflict retry, error handling by reference
3. **Domain table** (8 domains)

#### Domain Table (8 domains)

| Domain       | Covers                                                         |
| ------------ | -------------------------------------------------------------- |
| `page`       | Page CRUD, children/ancestors/descendants, move, versions      |
| `search`     | CQL search (V1 on both deployments)                            |
| `space`      | Space list/get — numeric id on Cloud, key on Server/DC         |
| `comment`    | Footer comments; inline comments Cloud only                    |
| `attachment` | List/delete; download via `download` skill; upload unsupported |
| `label`      | List (logical) / add, remove (V1 paths)                        |
| `analytics`  | Page views — Cloud only                                        |
| `user`       | Current user, user search (V1 paths)                           |

Every call must carry `service: "confluence"` — without it, logical paths such as `/pages/{id}` route to Jira instead.

### tools/ Subdirectory Structure

```
skills/confluence/
  SKILL.md
  tools/
    page/
      schema.md
    search/
      schema.md
    space/
      schema.md
    comment/
      schema.md
    attachment/
      schema.md
    label/
      schema.md
    analytics/
      schema.md
    user/
      schema.md
```

### V1 Full-Path Operations

CQL search, label writes, and user lookup have no V2 equivalent and are written as full paths rather than logical ones: `/wiki/rest/api/…` on Cloud, `/rest/api/…` on Server/DC — each schema states which. V2 logical paths (`/pages/{id}`, `/spaces`, `/footer-comments`) are the default elsewhere and DC-rewrite to `/rest/api/content/…`; Cloud V2 does have `/pages/{id}/descendants` (cursor-paginated, `depth` param), while DC descendants route to `/content/{id}/descendant/page`.

### Version Management Rules

Confluence page updates require `version.number` as a **mandatory parameter**:

```
1. Always fetch current page first -> get latest version.number
2. New version = current version + 1
3. On 409 conflict -> re-fetch -> retry (max 3 times)
```

---

## 6. media-analysis

> **Spec Reference**: `plugins/atlassian/skills/media-analysis/SKILL.md`

### Purpose

Download images, videos, and GIFs from Atlassian sources or local paths, optionally extract visually meaningful keyframes via scene-sieve, and produce a structured `analysis.json` by delegating semantic frame interpretation to the `media` sub-agent. Keeps multimodal frame data isolated in the sub-agent so the caller's context stays clean.

### SKILL.md Content Outline

```
- Skill name: media-analysis
- Domain: common
- User-invocable: true (slash command: /atlassian:media-analysis)
- MCP tools used: fetch (via download), none direct
- Sub-agent spawned: media (atlassian:media)
- Description: Atlassian attachment download + multimodal keyframe analysis
```

### Arguments

```
/atlassian:media-analysis <url-or-path> [--analyze] [--preset <name>] [--force]

<url-or-path>  Jira/Confluence attachment URL, or local file path
--analyze      Run the `media` agent after keyframe extraction; without it the result is the frames directory and frame count
--preset       Exact preset name (see scripts/probe.mjs's PRESETS table); otherwise auto-selected from extension, duration, and stated intent
--force        Ignore an existing analysis.json
```

### Workflow

```
1. Atlassian URL -> download via the `download` skill into .temp/<namespace>/<filename>; local files use namespace "local"
2. Run scripts/probe.mjs "<file>" [preset-name] -> probe.type, probe.duration, preset.name, argv, command
   - The second argument, when given, is matched as an exact preset name (from --preset or an intent keyword row)
3. Image -> return the path for multimodal Read; no keyframe extraction
4. Video/GIF -> run scene-sieve with `argv` plus `-o "<analysis-dir>/frames"`
5. --analyze -> spawn `media` (atlassian:media) with the frames directory, .metadata.json, the original path, and the analysis.json target; return its summary
```

### Output Layout

```
.temp/<namespace>/<filename>               downloaded original (from the download skill)
.temp/<namespace>/<filename>.analysis/
  frames/                                   frame_NNNN.jpg + .metadata.json
  analysis.json                             sub-agent output (final consumable)
```

`--force` re-runs the pipeline even when `analysis.json` exists. Otherwise the cached result is returned immediately.

### Presets

Preset definitions live only in `scripts/probe.mjs` (`PRESETS`); SKILL.md no longer mirrors them, and scene-sieve's CLI flags are discovered at failure time via `npx -y @lumy-pack/scene-sieve --describe` rather than documented in a static table.

### Sub-agent Contract

| Direction         | Payload                                                                            |
| ----------------- | ---------------------------------------------------------------------------------- |
| Caller -> `media` | `.temp/<namespace>/<filename>.analysis/` path containing frames + `.metadata.json` |
| `media` -> caller | `analysis.json` written in place; caller reads it                                  |

The `media` agent has only `Read`/`Write`/`Grep`/`Glob` tools — no Atlassian MCP tools, no network access. Frame images are loaded as multimodal input inside the sub-agent and released on termination.

### Directory Structure

```
skills/media-analysis/
  SKILL.md                    # Workflow protocol, alongside arguments/layout/contract
  scripts/
    probe.mjs                # ffprobe wrapper + PRESETS table + preset auto-selection
```

### Cross-Skill / Cross-Package Touch Points

- Reuses [`download`](#3-download) skill for the Atlassian attachment fetch step (no direct `fetch` call).
- Consumed by `imbas:digest` and `imbas:pipeline` skills when a Jira issue references attached images / videos / GIFs.

---

## 7. Skill Interface Contract

### Input (Agent -> Skill)

```typescript
interface SkillRequest {
  skill: string; // e.g., "jira-issue"
  operation: "GET" | "POST" | "PUT" | "DELETE";
  params: Record<string, any>; // Skill-specific parameters
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

Branching occurs in the endpoint-routing rules (stated in each router's own SKILL.md, e.g. `jira/SKILL.md`, `confluence/SKILL.md`) and the MCP layer only. Agent and Dispatcher are environment-agnostic.

| Branching Item                              | Layer                      |
| ------------------------------------------- | -------------------------- |
| API path (`/rest/api/3/` vs `/rest/api/2/`) | MCP (endpoint routing)     |
| Confluence V1 vs V2 / DC rewriting          | MCP (endpoint routing)     |
| User identifier (`accountId` vs `name`)     | Skill                      |
| Markdown vs ADF vs Wiki vs Storage format   | MCP (converter)            |
| Auth method (Basic / Bearer PAT)            | MCP (auth manager)         |
| Deployment (Cloud/Server) auto-detection    | MCP (environment resolver) |
