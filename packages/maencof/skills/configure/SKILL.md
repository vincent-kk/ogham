---
name: configure
user_invocable: true
description: Unified Claude Code environment configuration — scan, diagnose, and manage MCP servers, skills, agents, rules, hooks, and CLAUDE.md from a single entry point. Routes to specialized sub-skills.
version: 1.1.0
complexity: medium
context_layers: []
orchestrator: configurator
plugin: maencof
---

# configure — Unified Environment Configuration

Scan, diagnose, and manage the entire Claude Code project environment from a single entry point. Routes to specialized sub-skills for resolution.

## When to Use This Skill

- Run a health check on project configuration
- Discover and fix configuration issues
- Navigate to the right sub-skill when unsure which to use
- Migrate legacy configuration formats

> This skill is a **router** — it scans and delegates. It does not directly modify files.

## Scope

| Area | Path | Access |
|------|------|--------|
| Execution | `{CWD}/.mcp.json` | Read → `/maencof:bridge` |
| Execution | `{CWD}/.claude/settings.json` | Read → sub-skills |
| Execution | `{CWD}/CLAUDE.md` | Read → `/maencof:instruct` |
| Execution | `{CWD}/.claude/rules/` | Read → `/maencof:rule` |
| Execution | `{CWD}/.claude/skills/` | Read → `/maencof:craft-skill` |
| Execution | `{CWD}/.claude/agents/` | Read → `/maencof:craft-agent` |
| Execution | `{CWD}/.maencof-meta/` | Read → `/maencof:lifecycle` |
| Execution | `{CWD}/.claude/settings.local.json` | **Never** |
| Plugin | `packages/maencof/` | **Never** |

## Workflow

### Step 1 — Environment Scan
Check all config files/directories for existence, format, and spec compliance.

### Step 2 — Health Report
Display issues by severity (error/warning/info). Skip if clean.

### Step 3 — Identify Intent
Present sub-skill menu or detect intent from natural language.

### Step 4 — Route to Sub-Skill
Delegate to the appropriate skill (bridge, instruct, rule, lifecycle, craft-skill, craft-agent).

### Step 5 — Migration (when applicable)
Handle legacy format conversion with diff preview and confirmation.

> Load `reference.md` for routing table, health check details, migration guide, and error handling.

## Resources

| File | Content |
|------|---------|
| `reference.md` | Scan targets, health report format, routing table, migration workflow, error handling, acceptance criteria |

## Options

```
/maencof:configure [options]
```

| Option | Description |
|--------|-------------|
| `--scan` | Scan and report only (no modifications) |
| `--fix` | Auto-fix detected issues (with confirmation) |
| `--migrate` | Run legacy migration only |
