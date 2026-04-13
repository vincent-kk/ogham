# Atlassian Claude Code Plugin — Design Index

> **Status**: Design Document  
> **Date**: 2026-04-13  
> **Type**: [ARCH] Self-contained

---

## 1. Purpose

This plugin fully replaces the existing `mcp-atlassian` Python MCP server with a native Claude Code Plugin. The key improvements are:

| Problem (Python Server) | Solution (This Plugin) |
|---|---|
| 50+ individual MCP tools cause tool bloat and waste LLM context | 4 generic HTTP tools (`get`, `post`, `put`, `delete`) + `convert` utility + `setup` tool |
| No domain knowledge — LLM must reconstruct complex workflows every time | Agent layer embeds domain expertise (Jira/Confluence) |
| Cloud/Server branching leaks into caller | MCP layer absorbs all environment differences |
| Format conversion (ADF/Wiki/Storage) exposed to caller | MCP layer handles all bidirectional Markdown conversion |

---

## 2. Architecture Overview

```
Claude Code Main Agent (= Dispatcher, no separate implementation)
    |
    +-- Agent: jira         (subagent, Jira domain expert)
    +-- Agent: confluence    (subagent, Confluence domain expert)
    |
    +-- Skill: atlassian-setup        (auth/connection setup)
    +-- Skill: atlassian-download     (attachment download)
    +-- Skill: atlassian-jira         (Jira API domain router)
    +-- Skill: atlassian-confluence   (Confluence API domain router)
    |
    +-- MCP Server "tools"
            +-- get       (HTTP GET)
            +-- post      (HTTP POST)
            +-- put       (HTTP PUT)
            +-- delete    (HTTP DELETE)
            +-- convert   (ADF/Storage/Wiki <-> Markdown)
            +-- setup     (local web server auth setup)
```

### Layer Responsibilities

| Layer | Role | Stateful? |
|---|---|---|
| **Dispatcher** | Claude Code's built-in agent routing. No custom implementation. Simple tasks use Skills directly; complex workflows spawn Agents. | No |
| **Agent** | Domain expert with embedded knowledge (field formatting, workflow rules, error recovery). Defines "perspective". | Per-request |
| **Skill** | API spec capsule + reference docs. SKILL.md provides tool catalog; `tools/` subdirectories provide detailed schemas on-demand. Defines "action". | No (stateless) |
| **MCP** | Generic HTTP executor + format converter + auth manager. Zero domain knowledge. | No |

### Dependency Direction

```
Dispatcher --> Agent --> Skill --> MCP --> Atlassian REST API
```

- **Unidirectional only**: upper layers call lower layers. Lower layers are unaware of upper layers.
- **No cross-agent communication**: Jira Agent and Confluence Agent cannot call each other. Cross-domain coordination goes through the Dispatcher.
- **Skills do not call other Skills**: composite Skill orchestration is the Agent's responsibility.

### Lazy Reference Loading

Token-efficient pattern where only needed reference docs are loaded:

```
1. Skill selected (atlassian-jira / atlassian-confluence)
   -> SKILL.md loaded: tool catalog + one-line descriptions

2. LLM decides which tool to use
   -> Based on SKILL.md tool list

3. Only the relevant tool's reference loaded
   -> tools/<domain>/schema.md etc.

4. MCP tool invocation
   -> get/post/put/delete + convert combination
```

This ensures frequently-used tools load quickly while rarely-used tools consume zero context until needed.

---

## 3. Naming Convention

| Target | Rule | Examples |
|---|---|---|
| Agent | No prefix | `jira`, `confluence` |
| Skill | Plugin name prefix | `atlassian-setup`, `atlassian-jira`, `atlassian-confluence`, `atlassian-download` |
| MCP server name | `tools` | `.mcp.json` key: `"tools"` |
| MCP tool name | No prefix | `get`, `post`, `put`, `delete`, `convert`, `setup` |

---

## 4. Cloud vs Server/DC Branching

**Core principle**: Cloud/Server branching occurs ONLY in MCP Layer and Skill Layer. Agents and Dispatcher are environment-agnostic.

| Layer | Environment Awareness |
|---|---|
| Dispatcher | Agnostic |
| Agent | Agnostic |
| Skill | Aware — endpoint path, field name, API version branching |
| MCP | Aware — `is_cloud` detection, auth method, format conversion |

---

## 5. Document Index

Read documents in the following order for a complete understanding:

| # | Document | Type | Description |
|---|---|---|---|
| 1 | [INDEX.md](INDEX.md) | ARCH | This file — overview and reading guide |
| 2 | [plugin-structure.md](plugin-structure.md) | ARCH | Directory layout, plugin.json, .mcp.json, src/ structure |
| 3 | [auth-ui.md](auth-ui.md) | ARCH | Setup web server + HTML form design |
| 4 | [dev/mcp-tools.md](dev/mcp-tools.md) | DEV | 6 MCP tools (get/post/put/delete/convert/setup) |
| 5 | [dev/skills.md](dev/skills.md) | DEV | 4 Skills + tools/ reference mapping |
| 6 | [dev/agents.md](dev/agents.md) | DEV | 2 Agents (jira, confluence) |

**Document types**:
- **[ARCH]**: Self-contained architectural document. No external references. Usable independently after source repo removal.
- **[DEV]**: Development mapping document. May reference original spec files at `/Users/Vincent/Workspace/mcp-atlassian/.docs/.spec/` for detailed implementation guidance.
