# Tool Catalog — Deep Dive

Advanced tool restriction patterns, context-dependent availability, and common combinations.

For the complete tool list, see **reference.md Section 2**.

---

## Tool Restriction Patterns

### Pattern 1: Pure Read-Only

No modifications, no execution. Safe for analysis tasks.

```yaml
tools: Read, Grep, Glob
```

Use case: code review, documentation analysis, codebase exploration.

### Pattern 2: Read-Only with Shell

Read-only analysis plus shell access for running read commands (git log, test results, etc.).

```yaml
tools: Read, Grep, Glob, Bash
```

Use case: code review needing git history, test output analysis. Note: Bash can still modify files — consider hooks for enforcement.

### Pattern 3: Full Modification

Complete read-write access for implementation tasks.

```yaml
tools: Read, Write, Edit, Bash, Grep, Glob
```

Use case: feature implementation, refactoring, bug fixing.

### Pattern 4: Scoped MCP Access

Read-only with specific MCP server tools.

```yaml
tools: Read, Grep, Glob, mcp__database__query, mcp__database__list_tables
```

Use case: data analysis, database inspection without write access.

### Pattern 5: Restricted Subagent Spawning

Allow spawning only specific subagent types.

```yaml
tools: Agent(code-reviewer, test-runner), Read, Grep, Bash
```

Use case: orchestrator agents that delegate to known specialists.

### Pattern 6: Network-Enabled Research

Read access plus web capabilities for research tasks.

```yaml
tools: Read, Grep, Glob, WebFetch, WebSearch
```

Use case: documentation research, API exploration, dependency analysis.

---

## Tool Availability by Context

| Tool | Foreground | Background | Plugin |
| --- | --- | --- | --- |
| Read, Grep, Glob | Yes | Yes | Yes |
| Edit, Write | Yes | Yes | Yes |
| Bash | Yes | Yes (auto-deny unapproved) | Yes |
| AskUserQuestion | Yes | **No** (fails silently) | Yes |
| Agent | Yes | Yes | Yes |
| WebFetch, WebSearch | Yes | Yes (auto-deny unapproved) | Yes |
| MCP tools | Yes | **No** (unavailable) | **No** |
| SendMessage | Yes | Yes | No |
| TaskCreate/Update/etc. | Yes | Yes | Yes |

### Background Agent Implications

- Cannot prompt users → design for full autonomy
- Permission-requiring tools auto-denied unless pre-approved
- MCP tools unavailable — use only core tools
- AskUserQuestion fails silently — avoid in background agent tool lists

### Plugin Agent Restrictions

- `hooks`, `mcpServers`, `permissionMode` fields ignored
- MCP tools unavailable
- All other tools function normally

---

## Common Tool Combinations by Archetype

| Archetype | Tools | Notes |
| --- | --- | --- |
| Code Reviewer | `Read, Grep, Glob` | Pure analysis |
| Test Runner | `Read, Grep, Glob, Bash` | Needs shell for test execution |
| Implementer | `Read, Write, Edit, Bash, Grep, Glob` | Full modification |
| Researcher | `Read, Grep, Glob, WebFetch, WebSearch` | Web-enabled analysis |
| Data Analyst | `Read, Grep, Glob, mcp__db__query` | MCP database access |
| Orchestrator | `Agent(worker-a, worker-b), Read, Grep` | Delegates to specialists |
| Documenter | `Read, Write, Grep, Glob` | Read code, write docs |
