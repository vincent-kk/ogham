---
name: setup
user_invocable: true
description: coffaen onboarding wizard — Core Identity collection + knowledge tree initialization (6 stages)
version: 1.0.0
complexity: complex
context_layers: [1]
orchestrator: setup skill
plugin: coffaen
---

# setup — coffaen Onboarding Wizard

A 6-stage interview-style wizard for first-time coffaen setup or Core Identity reset.
Presents one question at a time; every stage can be skipped.

## When to Use This Skill

- Immediately after installing coffaen for the first time
- When you want to update Core Identity (values, boundaries, preferences) — use `--step` to re-run a specific stage
- When you need to change the knowledge tree path
- When manually resetting the Progressive Autonomy Level

## 6-Stage Wizard Flow

### Stage 1 — Welcome + Knowledge Space Path Setup

Collect the vault absolute path via AskUserQuestion.
- Default: `~/.coffaen/`
- If the path does not exist, confirm whether to create it
- Also create the `.coffaen/` cache directory and `.coffaen-meta/` metadata directory

### Stage 2 — Core Identity Interview (minimum 5 questions)

Ask questions sequentially via AskUserQuestion. Each question is independent and can be skipped with "later".

Required set (5 questions):
1. Name/title — "What would you like to be called?"
2. Three core values — "What are the three values most important to you?"
3. One absolute boundary — "Tell me one thing that must never be done."
4. Primary interests — "What area or project are you most interested in right now?"
5. Communication style — "What style of communication do you prefer?"

Optional set (5 questions, suggested after completing required):
6. Occupation/role | 7. Long-term goals | 8. Learning style | 9. Decision criteria | 10. Daily routine

### Stage 3 — Initial Knowledge Tree Scaffolding

Generate Layer 1 documents from the collected interview answers:

| File | Content |
|------|---------|
| `01_Core/identity.md` | Name, title, identity |
| `01_Core/values.md` | Core values |
| `01_Core/boundaries.md` | Absolute boundaries |
| `01_Core/preferences.md` | Communication preferences |
| `01_Core/trust-level.json` | Level 0 initialization |

Create each document with the `coffaen_create` MCP tool (layer=1, tags required).

Also create the `02_Derived/`, `03_External/`, and `04_Action/` directories.

Delegate to the identity-guardian agent to verify Frontmatter rule compliance for the generated L1 documents via coffaen_read.

### Stage 4 — Progressive Autonomy Level 0 Setup

Initialize `01_Core/trust-level.json` at Level 0:
```json
{
  "current_level": 0,
  "interaction_count": 0,
  "success_count": 0,
  "last_escalation_date": null,
  "lock_status": false
}
```

### Stage 5 — Initial Index Build

Check index status with the `kg_status` MCP tool.
- If an existing markdown vault is present: suggest a full build and run `/coffaen:build` after user confirmation
- If new: run a lightweight build with the generated L1 documents

### Stage 6 — First Memory Recording Guide

Display a completion message along with guidance for:
- `/coffaen:remember` — record new knowledge
- `/coffaen:recall` — search past knowledge
- `/coffaen:build` — build the full index
- `/coffaen:doctor` — check system health

## Agent Collaboration

```
setup skill starts
  -> Stage 3: identity-guardian agent — review/protect L1 documents after creation
  -> Stage 5: invoke build skill (with user approval)
  -> setup skill: provide completion summary and guidance
```

## Available MCP Tools

| Tool | Purpose |
|------|---------|
| `coffaen_create` | Create L1 documents |
| `coffaen_read` | Verify existing L1 documents |
| `kg_status` | Check index status |

## Options

```
/coffaen:setup [--step <stage>] [--reset]
```

| Option | Description |
|--------|-------------|
| `--step <1-6>` | Re-run a specific stage only |
| `--reset` | Full reset (preserves existing L1 documents) |

## Acceptance Criteria

- 4 documents in `01_Core/` + `trust-level.json` created
- `02_Derived/`, `03_External/`, `04_Action/` directories created
- Progressive Autonomy Level 0 set
- Skip responses allowed (all stages)
