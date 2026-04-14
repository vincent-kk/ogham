# @ogham/atlassian

A Claude Code plugin that integrates Atlassian Jira and Confluence natively.

Instead of exposing 50+ individual MCP tools that cause context bloat, this plugin provides a native Claude Code integration using **Domain Expert Agents** and a **Token-efficient Lazy Reference Loading** pattern. It fully replaces the existing Python `mcp-atlassian` server.

---

## Installation

### Via Marketplace (Recommended)

```bash
# 1. Add the repository to your marketplace
claude plugin marketplace add https://github.com/vincent-kk/ogham

# 2. Install the plugin
claude plugin install atlassian
```

All components (Skills, MCP, Agents) register automatically.

### For Development (Local Setup)

```bash
# From monorepo root
yarn install

# Build the plugin
cd packages/atlassian
yarn build

# Load in Claude Code
claude --plugin-dir ./packages/atlassian
```

Building produces the MCP server bundle at `bridge/mcp-server.cjs`.

---

## How to Use

Unlike standard MCP servers that dump tools into the LLM context, this plugin uses **Agents** and **Skills**. You interact with them through natural language in Claude Code. The plugin transparently handles Cloud/Server branching and format conversions (ADF/Storage/Wiki <-> Markdown).

### Initial Setup

```
/atlassian-setup
```

Configures authentication (Basic, PAT, OAuth 2.0) and connection details for your Jira/Confluence Cloud or Server/DC instances. Uses a local web server for a seamless setup experience.

### Jira Operations

Just ask naturally. The **Jira Agent** will handle JQL formatting, field schemas, state transitions, and error recovery.

```
Show me the open issues assigned to me in Jira.
Change the status of PROJ-123 to 'In Progress'.
Create a new bug issue in the DEV project about the login failure.
```

### Confluence Operations

The **Confluence Agent** handles CQL, page hierarchy, V1/V2 API selection, and Storage Format XHTML conversion.

```
Find recently updated documents in the 'Engineering' space.
Summarize the content of Confluence page 12345.
Create a new page in the TEAM space with these meeting notes.
```

### Cross-Domain Workflows

Claude Code can seamlessly coordinate between the Jira and Confluence agents.

```
Read the details of Jira issue PROJ-456 and draft a release note on Confluence.
```

---

## Architecture

The plugin uses a 4-layer architecture to maximize efficiency and reliability:

1. **Dispatcher**: Claude Code's built-in agent routing.
2. **Agent Layer**: Domain experts (`jira`, `confluence`) with embedded knowledge (formatting, workflow rules, error recovery strategies). They orchestrate multi-step tasks.
3. **Skill Layer**: API spec capsules (`atlassian-jira`, `atlassian-confluence`) that use **Lazy Reference Loading** to keep the context window small. Tool schemas are only loaded when needed.
4. **MCP Layer**: Zero-domain-knowledge utility layer providing generic HTTP execution (`fetch`), bidirectional format conversion (`convert`), and auth setup (`setup`).

---

## Skills Reference

| Skill | Scope | What it does |
| --- | --- | --- |
| `/atlassian-setup` | Common | Auth and connection management (Basic, PAT, OAuth 2.0) |
| `/atlassian-download` | Common | Unified attachment download for both platforms |
| `/atlassian-jira` | Jira | Jira API domain router (15 domains including issue, search, agile, etc.) |
| `/atlassian-confluence` | Confluence | Confluence API domain router (8 domains including page, search, space, etc.) |

---

## Development

```bash
yarn dev            # TypeScript watch mode
yarn test           # Vitest watch
yarn test:run       # Single run
yarn typecheck      # Type checking only
yarn build          # tsc + node scripts/build-mcp-server.mjs
```

### Tech Stack

TypeScript 5.7, @modelcontextprotocol/sdk, esbuild, Vitest, Zod

---

## Documentation

For technical details and architectural decisions, see the [`.metadata/atlassian/`](../../.metadata/atlassian/) directory:

| Document | Content |
| --- | --- |
| [INDEX](../../.metadata/atlassian/INDEX.md) | Architecture overview and layer responsibilities |
| [plugin-structure](../../.metadata/atlassian/plugin-structure.md) | Directory layout and plugin configuration |
| [auth-ui](../../.metadata/atlassian/auth-ui.md) | Setup web server and HTML form design |
| [dev/mcp-tools](../../.metadata/atlassian/dev/mcp-tools.md) | 3 Core MCP tools (`fetch`, `convert`, `setup`) |
| [dev/skills](../../.metadata/atlassian/dev/skills.md) | 4 Skills and lazy reference loading mapping |
| [dev/agents](../../.metadata/atlassian/dev/agents.md) | Jira and Confluence agent domain logic |

[Korean documentation (README-ko_kr.md)](./README-ko_kr.md) is also available.

---

## License

MIT
