# SPEC-provider — Issue Tracker Provider Abstraction

> Status: Draft v1.0 (2026-04-04)
> Parent: [BLUEPRINT.md](../BLUEPRINT.md)

---

## 1. Overview

imbas supports multiple issue tracker backends (Jira, GitHub Issues) through a provider abstraction. The core pipeline (validate → split → devplan → manifest) is provider-agnostic. Provider-specific behavior is isolated at the **skill dispatch level** — skills read `config.provider` and branch tool calls accordingly.

### Design Principles

1. **No separate MCP server for providers** — Jira uses existing Atlassian MCP tools. GitHub uses `gh` CLI via Bash. No additional MCP adapter layer.
2. **Skill-level dispatch** — Skills contain provider-aware branching. Agents remain provider-agnostic (they produce manifests, not issue tracker mutations).
3. **Unified manifest schema** — Provider-agnostic field names (`issue_ref`, `project_ref`) across all manifests.
4. **Config-driven** — `config.provider` determines which backend is active. Provider-specific settings live under `config.jira` or `config.github`.

---

## 2. Abstract Interface

Conceptual operations that every provider must support. Not a TypeScript interface — this defines what the **skill prompt** must be able to do for each provider.

### 2.1 Issue Operations

| Operation | Description | Jira Implementation | GitHub Implementation |
|-----------|-------------|--------------------|-----------------------|
| `create_issue` | Create issue with type, title, body, parent | `createJiraIssue` | `gh issue create` |
| `get_issue` | Fetch issue details | `getJiraIssue` | `gh issue view --json` |
| `edit_issue` | Update issue fields | `editJiraIssue` | `gh issue edit` |
| `search_issues` | Query issues by criteria | `searchJiraIssuesUsingJql` | `gh issue list --label --search --json` |
| `add_comment` | Post comment to issue | `addCommentToJiraIssue` | `gh issue comment` |

### 2.2 State Transitions

| Operation | Description | Jira | GitHub |
|-----------|-------------|------|--------|
| `transition_issue` | Change workflow state | `getTransitionsForJiraIssue` + `transitionJiraIssue` | Label swap + `gh issue close` (for done) |
| `get_transitions` | Available next states | `getTransitionsForJiraIssue` | All states always available (label-based) |

### 2.3 Link Operations

| Operation | Description | Jira | GitHub |
|-----------|-------------|------|--------|
| `create_link` | Typed link between issues | `createIssueLink` | Body meta block edit + `#N` reference |

### 2.4 Metadata Operations

| Operation | Description | Jira | GitHub |
|-----------|-------------|------|--------|
| `get_project_meta` | Project/repo info | `getVisibleJiraProjects` | `gh repo view --json` |
| `get_issue_types` | Available types | `getJiraProjectIssueTypesMetadata` | `gh label list --json` (type: labels) |
| `get_link_types` | Available link types | `getIssueLinkTypes` | Fixed set (meta block convention) |
| `validate_setup` | Auth + config check | Cache meta validation | `gh auth status` + label check |

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
| GitHub | `#NNN` | `#42` |

In manifests, the field is always `issue_ref` (replaces former `jira_key`).

### 3.5 Project Reference Format

| Provider | Format | Example |
|----------|--------|---------|
| Jira | Project key | `PROJ` |
| GitHub | `owner/repo` | `acme/backend` |

In config/state, the field is always `project_ref` (replaces former `project_key`).

---

## 4. Skill Dispatch Pattern

### 4.1 Branching Structure

Each skill that interacts with the issue tracker follows this pattern:

```
Step N — [Operation Name]
  1. config = imbas_config_get()
  2. Branch on config.provider:

  [jira]
    - Use Atlassian MCP tool: <specific tool>(<params>)
    - Parse Jira response format

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
| **read-issue** | Issue + comment fetch | Steps 1-2 (fetch + parse) |
| **cache** | Metadata refresh | Entire workflow |

### 4.3 Which Skills Don't Branch

| Skill | Reason |
|-------|--------|
| **status** | Only reads `.imbas/` state files |
| **fetch-media** | Local file + scene-sieve (provider-agnostic) |

### 4.4 Agent Tool Lists

Agents don't branch. Their tool lists include both provider options, and the **skill prompt** controls which tools are actually invoked:

```yaml
# imbas-analyst tools (example)
tools:
  - Read, Grep, Glob
  # Jira provider (used when config.provider == "jira")
  - getConfluencePage
  - searchConfluenceUsingCql
  - getJiraIssue
  - searchJiraIssuesUsingJql
  # GitHub provider (used when config.provider == "github")
  - Bash    # for gh CLI calls
```

The agent prompt includes a provider directive section that specifies which tools to use based on the provider context passed by the calling skill.

---

## 5. Manifest Field Naming

All manifests use provider-agnostic field names:

| Former (Jira-only) | Current (Provider-agnostic) | Description |
|--------------------|-----------------------------|-------------|
| `project_key` | `project_ref` | `"PROJ"` or `"owner/repo"` |
| `epic_key` | `epic_ref` | `"PROJ-100"` or `"#10"` |
| `jira_key` | `issue_ref` | `"PROJ-101"` or `"#11"` |

Added field:
| Field | Description |
|-------|-------------|
| `provider` | `"jira"` or `"github"` — records which provider created the manifest |

---

## 6. Cache Abstraction

Provider metadata cache lives under `.imbas/<project-dir>/cache/`. The directory name is derived from `project_ref`:

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
| Issue not found | `getJiraIssue` error | `gh issue view` exit code 1 |
| Rate limit | HTTP 429 | `gh` CLI auto-retries (built-in) |
| Permission denied | HTTP 403 | `gh` CLI error → "Check repo access" |
| Label missing | N/A (types are native) | Auto-create missing labels (setup or on-demand) |

---

## Related

- [SPEC-provider-jira.md](./SPEC-provider-jira.md) — Jira-specific implementation
- [SPEC-provider-github.md](./SPEC-provider-github.md) — GitHub-specific implementation
- [SPEC-state.md](./SPEC-state.md) — Config & state schemas
- [SPEC-skills.md](./SPEC-skills.md) — Skills that dispatch to providers
- [BLUEPRINT.md](../BLUEPRINT.md) — Architecture overview
