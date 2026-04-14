# SPEC-provider — Issue Tracker Provider Abstraction

> Status: Draft v1.1 (2026-04-06)
> Parent: [BLUEPRINT.md](../BLUEPRINT.md)

---

## 1. Overview

imbas supports multiple issue tracker backends (Jira, GitHub Issues, and local markdown files) through a provider abstraction. The core pipeline (validate → split → devplan → manifest) is provider-agnostic. Provider-specific behavior is isolated at the **skill dispatch level** — skills read `config.provider` and branch tool calls accordingly.

### Design Principles

1. **No separate MCP server for providers** — Jira uses existing Atlassian MCP tools. GitHub uses `gh` CLI via Bash. No additional MCP adapter layer.
2. **Skill-level dispatch** — Skills contain provider-aware branching. Agents remain provider-agnostic (they produce manifests, not issue tracker mutations).
3. **Unified manifest schema** — Provider-agnostic field names (`issue_ref`, `project_ref`) across all manifests.
4. **Config-driven** — `config.provider` determines which backend is active. Provider-specific settings live under `config.jira` or `config.github`; the `local` provider is file-based and primarily uses `defaults.project_ref`.

---

## 2. Abstract Interface

Conceptual operations that every provider must support. Not a TypeScript interface — this defines what the **skill prompt** must be able to do for each provider.

### 2.1 Issue Operations

| Operation | Description | Jira REST Endpoint | GitHub Implementation |
|-----------|-------------|-------------------|----------------------|
| `[OP: create_issue]` | Create issue with type, title, body, parent | `POST /rest/api/3/issue` | `gh issue create` |
| `[OP: get_issue]` | Fetch issue details | `GET /rest/api/3/issue/{key}` | `gh issue view --json` |
| `[OP: edit_issue]` | Update issue fields | `PUT /rest/api/3/issue/{key}` | `gh issue edit` |
| `[OP: search_jql]` | Query issues by criteria | `POST /rest/api/3/search/jql` | `gh issue list --label --search --json` |
| `[OP: add_comment]` | Post comment to issue | `POST /rest/api/3/issue/{key}/comment` | `gh issue comment` |

### 2.2 State Transitions

| Operation | Description | Jira REST Endpoint | GitHub |
|-----------|-------------|-------------------|--------|
| `[OP: transition_issue]` | Change workflow state | `POST /rest/api/3/issue/{key}/transitions` | Label swap + `gh issue close` (for done) |
| `[OP: get_transitions]` | Available next states | `GET /rest/api/3/issue/{key}/transitions` | All states always available (label-based) |

### 2.3 Link Operations

| Operation | Description | Jira REST Endpoint | GitHub |
|-----------|-------------|-------------------|--------|
| `[OP: create_link]` | Typed link between issues | `POST /rest/api/3/issueLink` | Body/meta section edit + `#N` or `owner/repo#N` reference |

### 2.4 Metadata Operations

| Operation | Description | Jira REST Endpoint | GitHub |
|-----------|-------------|-------------------|--------|
| `[OP: get_projects]` | Project/repo info | `GET /rest/api/3/project` | `gh repo view --json` |
| `[OP: get_issue_types]` | Available types | `GET /rest/api/3/issuetype/project?projectId={id}` | `gh label list --json` (type: labels) |
| `[OP: get_link_types]` | Available link types | `GET /rest/api/3/issueLinkType` | Fixed set (meta block convention) |
| `[OP: auth_check]` | Auth + config check | `GET /rest/api/3/myself` | `gh auth status` + label check |

The LLM resolves each `[OP:]` to an available session tool at runtime. REST endpoints
serve as fallback for generic HTTP tools when no dedicated tool is available.

---

## 3. Unified Type Definitions

### 3.1 Issue Types (Provider-Agnostic)

```
IssueType = "epic" | "story" | "task" | "subtask" | "bug"
```

Mapped to provider-specific representations via config:
- **Jira**: Native issue types (`"Epic"`, `"Story"`, `"Task"`, `"Sub-task"`, `"Bug"`)
- **GitHub**: Labels (`"type:epic"`, `"type:story"`, `"type:task"`, `"type:subtask"`, `"type:bug"`)

### 3.2 Workflow States (Provider-Agnostic)

```
WorkflowState = "todo" | "ready_for_dev" | "in_progress" | "in_review" | "done"
```

Mapped via config:
- **Jira**: Workflow states (`"To Do"`, `"Ready for Dev"`, `"In Progress"`, `"In Review"`, `"Done"`)
- **GitHub**: Labels (`"status:todo"`, `"status:ready-for-dev"`, etc.) + open/closed

### 3.3 Link Types (Provider-Agnostic)

```
LinkType = "blocks" | "is_blocked_by" | "split_into" | "split_from" | "relates_to"
```

Mapped via config:
- **Jira**: Native link types (`"Blocks"`, `"is split into"`, etc.)
- **GitHub**: Body meta block markers (see SPEC-provider-github.md §4)

### 3.4 Issue Reference Format

| Provider | Format | Example |
|----------|--------|---------|
| Jira | `PROJECT-NNN` | `PROJ-123` |
| GitHub | `owner/repo#NNN` | `acme/backend#42` |
| Local | `PREFIX-NNN` | `S-42` |

In manifests, the field is always `issue_ref` (replaces former `jira_key`).
GitHub may display `#42` in same-repo prose, but the canonical stored
reference in manifests and feedback targets is the fully qualified
`owner/repo#42` form.

### 3.5 Project Reference Format

| Provider | Format | Example |
|----------|--------|---------|
| Jira | Project key | `PROJ` |
| GitHub | `owner/repo` | `acme/backend` |
| Local | Project key / fallback directory key | `LOCAL` |

In config/state, the field is always `project_ref` (replaces former `project_key`).

---

## 4. Skill Dispatch Pattern

### 4.1 Branching Structure

Each skill that interacts with the issue tracker follows this pattern:

```
Step N — [Operation Name]
  1. config = config_get()
  2. Branch on config.provider:

  [jira]
    - Use [OP: <operation>] — resolved to available session tool at runtime
    - REST fallback: see SPEC-provider-jira.md §3 for endpoint mapping

  [github]
    - Use Bash: gh <command> <flags> --json <fields>
    - Parse gh CLI JSON output
```

### 4.2 Which Skills Branch

| Skill | Provider Interaction | Branch Points |
|-------|---------------------|---------------|
| **setup** | Metadata fetch, cache init, label creation | Init workflow, cache refresh |
| **validate** | Document source (Confluence for Jira) | Step 2 only (source resolution) |
| **split** | Epic lookup, existing issue search | Step 2 (Epic), Step 3 (search) |
| **devplan** | Story lookup, duplicate search | Step 1 (manifest check), Step 2 (search) |
| **manifest** | Issue creation, linking, transitions | Step 4 (entire batch execution) |
| **digest** | Comment posting | Step 6 (publish) |
| **`imbas:read-issue`** | Issue + comment fetch | Steps 1-2 (fetch + parse) |
| **cache** | Metadata refresh | Entire workflow |

### 4.3 Which Skills Don't Branch

| Skill | Reason |
|-------|--------|
| **status** | Only reads `.imbas/` state files |
| **`imbas:fetch-media`** | Local file + scene-sieve (provider-agnostic) |

### 4.4 Agent Tool Lists (Semantic Operations)

Agents do not list provider-specific tools in their `tools:` frontmatter. Instead,
skill workflows declare intent via `[OP:]` semantic notation, and the LLM resolves
which tool to call at runtime based on available session tools.

```yaml
# imbas-analyst tools (v0.2.0)
tools:
  - Read
  - Grep
  - Glob
  - Bash
# No Jira/GitHub tools listed — resolved at runtime via [OP:] notation
```

This approach eliminates the need for provider-specific tool grants and supports
any Jira-compatible tool (Atlassian Cloud MCP, on-premise MCP, custom plugins)
without plugin configuration changes.

---

## 5. Manifest Field Naming

All manifests use provider-agnostic field names:

| Former (Jira-only) | Current (Provider-agnostic) | Description |
|--------------------|-----------------------------|-------------|
| `project_key` | `project_ref` | `"PROJ"` or `"owner/repo"` |
| `epic_key` | `epic_ref` | `"PROJ-100"` or `"acme/backend#10"` |
| `jira_key` | `issue_ref` | `"PROJ-101"` or `"acme/backend#11"` or `"S-11"` |

Added field:
| Field | Description |
|-------|-------------|
| `provider` | `"jira"` or `"github"` or `"local"` — records which provider created the manifest |

---

## 6. Cache Abstraction

Provider metadata cache lives under `.imbas/<project-dir>/imbas:cache/`. The directory name is derived from `project_ref`:

| Provider | project_ref | Directory Name |
|----------|-------------|----------------|
| Jira | `PROJ` | `PROJ/` |
| GitHub | `owner/repo` | `owner--repo/` (slash → double dash) |

Cache file contents differ by provider but serve the same purpose:

| Cache File | Jira Content | GitHub Content |
|------------|-------------|----------------|
| `project-meta.json` | Project key, name, URL, lead | Repo name, owner, URL, default branch |
| `issue-types.json` | Jira issue type definitions + fields | Label list (type: labels only) |
| `link-types.json` | Jira link type definitions | Fixed imbas convention set |
| `workflows.json` | Workflow states + transition map | Label list (status: labels) + open/closed rules |
| `cached_at.json` | Timestamp + TTL | Same |

---

## 7. Error Handling by Provider

| Scenario | Jira | GitHub |
|----------|------|--------|
| Auth failure | Atlassian MCP error → "Check Atlassian token" | `gh auth status` failure → "Run `gh auth login`" |
| Issue not found | `[OP: get_issue]` error | `gh issue view` exit code 1 |
| Rate limit | HTTP 429 | `gh` CLI auto-retries (built-in) |
| Permission denied | HTTP 403 | `gh` CLI error → "Check repo access" |
| Label missing | N/A (types are native) | Auto-create missing labels (setup or on-demand) |

---

## Related

- [SPEC-provider-jira.md](./SPEC-provider-jira.md) — Jira-specific implementation
- [SPEC-provider-github.md](./SPEC-provider-github.md) — GitHub-specific implementation
- [SPEC-provider-local.md](./SPEC-provider-local.md) — Local file-based implementation
- [SPEC-state.md](./SPEC-state.md) — Config & state schemas
- [SPEC-skills.md](./SPEC-skills.md) — Skills that dispatch to providers
- [SPEC-tools.md](./SPEC-tools.md) — imbas MCP 도구 정의
- [BLUEPRINT.md](../BLUEPRINT.md) — Architecture overview

> **Implementation Note:** Provider 구현 시 `src/constants/pipeline.ts` (phase 순서, agent 이름)와 `src/utils/` (findDuplicates, setNested)를 활용할 수 있다.
