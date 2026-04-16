---
name: maencof-setup
user_invocable: true
description: "[maencof:maencof-setup] Runs the 7-stage maencof onboarding interview. Acts as a 'Professional Counselor' to dynamically understand and construct your Core Identity, values, boundaries, and AI persona through empathetic dialogue."
argument-hint: "[--step STAGE] [--reset]"
version: "3.0.0"
complexity: complex
context_layers: [1]
orchestrator: maencof-setup skill
plugin: maencof
---

# maencof-setup — maencof Onboarding Consultation

A 7-stage goal-driven dynamic interview for first-time maencof setup or Core Identity reset.
Instead of a rigid questionnaire, the AI acts as a **"Professional Counselor"**—logical, empathetic, and structured. It helps you explore your knowledge management patterns and organically constructs your Core Identity schema.

## When to Use This Skill

- Immediately after installing maencof for the first time
- When you want to update Core Identity (values, boundaries, preferences) — use `--step` to re-run a specific stage
- When you need to change the knowledge tree path
- When manually resetting the Progressive Autonomy Level

## When to Use vs Adjacent Skills

- **`maencof-setup`** — one-time onboarding consultation. Runs a 7-stage
  "Professional Counselor" interview that constructs your Core Identity,
  synthesizes an AI companion persona, scaffolds Layer directories, and
  builds the initial index. Re-run a specific stage via `--step` or reset
  Core Identity via `--reset`.
- **`maencof-configure`** — ongoing configuration router. Scans, health-
  checks, and delegates to 7 sub-skills (bridge, instruct, rule, lifecycle,
  craft-skill, craft-agent, checkup) for post-onboarding environment drift.

Rule of thumb: vault does not yet exist, or Core Identity needs reset →
`setup`. Vault exists and something needs tuning → `configure`.

## 7-Stage Consultation Flow

→ Load **reference.md** when executing any stage to access schema definitions, guidelines, and output templates.
**Important:** All interactions must follow the user's configured language. While templates are provided in English, translate them naturally at runtime.

### Stage 1 — Welcome & Space Initialization (Path Setup)

Collect the vault absolute path via `AskUserQuestion`.
→ Use templates T1-1, T1-2, T1-3 from reference.md.

- Default: `~/.maencof/`
- If the path does not exist, confirm whether to create it.
- Also create the `.maencof/` cache directory and `.maencof-meta/` metadata directory.
- **Provision default config files**: After creating directories, provision all missing
  config files with defaults (insight-config.json, vault-commit.json, lifecycle.json,
  data-sources.json, auto-insight-stats.json, usage-stats.json).
  Display the list of provisioned files to the user.

### Stage 2 — Dynamic Identity Discovery (The Interview)

**Goal:** Through natural, empathetic conversation, collect the 5 key dimensions of the `CoreIdentitySchema` defined in `reference.md`.
**Tool:** Use `AskUserQuestion` (type: `text` for open-ended, `choice` only when narrowing down is helpful).

**Execution Loop:**
1. **Open:** Start with a broad, empathetic question about their current knowledge management state (e.g., "Welcome. To help you build a space that truly fits your needs, could you tell me a bit about what brings you here and what challenges you're currently facing with your information?").
2. **Understand & Synthesize:** Analyze the user's free-form response. Infer which schema fields (e.g., Core Values, Primary Interest) are implicitly answered.
3. **Reflect & Probe:** Provide a brief, professional reflection ("I see, it sounds like you're looking for X because of Y..."). Then, ask a targeted follow-up question to uncover the remaining missing schema fields.
4. **Complete:** Once you confidently have enough signal for all 5 schema fields (Name, Interest, Values, Boundary, Style), exit the loop and present the summary (T2-DONE).

*Crucial:* Maintain the persona of a professional counselor. Do NOT use medical or clinical terms like "diagnosis" or "patient". Be calm and structured.

### Stage 3 — AI Companion Proposal (Persona Synthesis)

Synthesize an AI companion persona holistically based on the Stage 2 discovery.
→ See `reference.md` § Stage 3 for the Synthesis Guidelines. Load **examples.md** § Example 2 for sample output.

1. **Synthesize Persona**: Holistically design a companion that acts as a perfect partner for the user's stated needs and work style. Fill the `CompanionIdentitySchema`.
2. **Propose & Refine**: Present the proposed persona (template T3-1) via `AskUserQuestion` with options:
   - **Use** — Save to `.maencof-meta/companion-identity.json`
   - **Regenerate** — Generate a new persona with a different approach
   - **Skip** — Do not create a companion identity; proceed to next stage
3. **Skip behavior**: If the user skips, do NOT add `companion-identity` to `completedSteps`. Proceed normally to Stage 4.
4. **Reset**: `--reset --companion` deletes the existing `companion-identity.json`, re-reads L1 documents for context, and re-synthesizes the persona.

### Stage 4 — Initial Knowledge Tree Scaffolding

Generate Layer 1 documents from the synthesized discovery.
→ Use templates T4-1, T4-2 from `reference.md`.

| File | Content |
|------|---------|
| `01_Core/identity.md` | Name, role (inferred), primary interest |
| `01_Core/values.md` | The 3 synthesized core values with brief explanations |
| `01_Core/boundaries.md` | Absolute boundaries |
| `01_Core/preferences.md` | Communication preferences |

Create the 4 markdown documents above with `mcp_t_create` (layer=1, tags required).
Note: `01_Core/trust-level.json` is created separately in Stage 5 — it is a pure JSON file and cannot use `mcp_t_create`, which requires layer/tags and always emits Frontmatter markdown.

Also create the Layer directories and sub-layer subdirectories:
- `02_Derived/`
- `03_External/`, `03_External/relational/`, `03_External/structural/`, `03_External/topical/`
- `04_Action/`
- `05_Context/`, `05_Context/buffer/`, `05_Context/boundary/`

Delegate to the `identity-guardian` agent to verify Frontmatter rule compliance for the generated L1 documents via read.

### Stage 5 — Progressive Autonomy Level 0 Setup

Create and initialize `01_Core/trust-level.json` at Level 0:

```json
{
  "current_level": 0,
  "interaction_count": 0,
  "success_count": 0,
  "last_escalation_date": null,
  "lock_status": false
}
```

**Creation method**: Use the `Bash` tool to write `trust-level.json` directly to the **absolute vault root path collected in Stage 1** (NOT a CWD-relative path — Stage 5 may run from any subdirectory of the vault). Substitute the literal absolute path; do not rely on CWD. If `MAENCOF_VAULT_PATH` is set in the env, prefer it as a fallback:

```bash
echo '{"current_level":0,"interaction_count":0,"success_count":0,"last_escalation_date":null,"lock_status":false}' > "${MAENCOF_VAULT_PATH:-<vault-root>}/01_Core/trust-level.json"
```

The `layer-guard` PreToolUse hook matches only `Write|Edit`, so `Bash` is not intercepted regardless of vault state. This applies to both initial setup and `--reset` mode.

> Note: This `Bash` pattern applies only to `trust-level.json` (a JSON config file that cannot use `mcp_t_create`). Markdown L1 documents must always go through the `identity-guardian` agent.

### Stage 6 — Initial Index Build

Check index status with `mcp_t_kg_status`.
- If an existing markdown vault is present: suggest a full build and run `/maencof:maencof-build` after user confirmation.
- If new: run a lightweight build with the generated L1 documents.

### Stage 7 — Completion & Guidance

Display a completion message with next-step guidance (T7-1).

## Agent Collaboration

```
setup skill starts
  -> Stage 4: identity-guardian agent — review/protect L1 documents
  -> Stage 6: invoke build skill (with user approval)
  -> setup skill: provide completion summary and guidance
```

## Available Tools

| Tool | Purpose |
|------|---------|
| `AskUserQuestion` | Conduct the dynamic discovery interview (Stages 1–3) |
| `mcp_t_create` | Create L1 documents (Stage 4) |
| `mcp_t_read` | Verify existing L1 documents (Stage 4) |
| `mcp_t_kg_status` | Check index status (Stage 6) |
| `Bash` | Create/overwrite `trust-level.json` (Stage 5) |

## Options

| Option | Description |
|--------|-------------|
| `--step <1-7>` | Re-run a specific stage only |
| `--reset` | Full reset (recreates `trust-level.json`; existing L1 markdown documents are preserved) |
| `--reset --companion` | Reset companion identity only (delete JSON → re-read L1 → re-synthesize) |

## Error Handling

- **Vault path does not exist**: Ask the user to confirm creation before proceeding.
- **`mcp_t_create` failure**: Report error and skip to next document; resume at failed stage on retry.
- **`identity-guardian` unavailable**: Proceed without L1 Frontmatter verification and note in completion summary.
- **Already initialized**: Warn that re-running will overwrite existing Core Identity documents; require explicit `--reset` confirmation.

## Acceptance Criteria

- 4 documents in `01_Core/` + `trust-level.json` created.
- `02_Derived/`, `03_External/` (with `relational/`, `structural/`, `topical/`), `04_Action/`, `05_Context/` (with `buffer/`, `boundary/`) directories created.
- Progressive Autonomy Level 0 set.
- Stage 2 discovery covers all 5 CoreIdentitySchema fields (Name, Interest, Values, Boundary, Style).
- Companion identity synthesized and saved, or explicitly skipped.
