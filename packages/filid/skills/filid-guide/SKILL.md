---
name: filid-guide
user_invocable: true
description: "[filid:filid-guide] Scan the project hierarchy and query all active rules to generate a human-readable fractal structure guide with node classifications and new-module placement guidance for teams."
argument-hint: "[path]"
version: "1.0.0"
complexity: simple
plugin: filid
---

# filid-guide — Fractal Structure Guide

Scan the project's fractal structure and query all active rules to produce a
human-readable guidance document. Helps team members understand filid conventions
and how the current project is classified, so new modules are placed correctly.

> **Detail Reference**: For detailed workflow steps, MCP tool call examples,
> and output format templates, read the `reference.md` file in this
> skill's directory (same location as this SKILL.md).

## When to Use This Skill

- Introducing filid to a team and explaining its rules in project context
- Quickly checking how well the current structure follows fractal principles
- Confirming the category (fractal / organ / pure-function / hybrid) of a directory
- Getting guidance on where to place a new module without causing violations
- Reviewing the current state before running `/filid:filid-restructure` or `/filid:filid-sync`

## Core Workflow

### Phase 1 — Project Scan

Retrieve the full directory tree and node classifications using the `fractal_scan`
MCP tool. If `fractal_scan` returns an empty tree (no FCA-AI project detected or
empty directory), report "No FCA-AI structure found at the target path. Run
`/filid:filid-setup` to initialize the project." and exit.
See [reference.md Section 1](./reference.md#section-1--project-scan).

### Phase 2 — Rule Query

Fetch all active rules using `rule_query` (`action: "list"`) to build the rule
reference table included in the guide.
See [reference.md Section 2](./reference.md#section-2--rule-query).

### Phase 3 — Classification Summary

Summarise the node category distribution from the scan results.
Include any existing violations so readers know the current health status.
See [reference.md Section 3](./reference.md#section-3--classification-summary).

### Phase 4 — Guide Document Output

Combine rules, category criteria, the classification summary, and a new-module
checklist into a single guide document.
See [reference.md Section 4](./reference.md#section-4--guide-document-output).

## Available MCP Tools

| Tool           | Action | Purpose                                                      |
| -------------- | ------ | ------------------------------------------------------------ |
| `fractal_scan` | —      | Retrieve complete project hierarchy and node classifications |
| `rule_query`   | `list` | Fetch all active rules                                       |

## Options

> Options are LLM-interpreted hints, not strict CLI flags. Natural language works equally well.

```
/filid:filid-guide [path]
```

| Parameter | Type   | Default                   | Description                         |
| --------- | ------ | ------------------------- | ----------------------------------- |
| `path`    | string | Current working directory | Root directory to scan and document |

## Quick Reference

```bash
# Guide for current project
/filid:filid-guide

# Guide for a specific sub-directory
/filid:filid-guide src/features

# Category classification criteria (priority order per .claude/rules/fca.md)
fractal       = INTENT.md or DETAIL.md present, or default when no organ/pure rule applies
organ         = Directory name in KNOWN_ORGAN_DIR_NAMES (priority 2, name-based), or __wrapped__, or .dot-prefixed, or leaf dir with no fractal children
pure-function = Stateless, no side effects, no I/O
hybrid        = Mix of fractal children and organ-like files
```

Key rules:

- Organ directories must not contain fractal child nodes
- Fractal nodes must have an index.ts barrel export
- index.ts (barrel) is the primary entry point for a fractal node; main.ts is used for executable/CLI modules
- Directory naming convention: kebab-case
