---
name: setup
user-invocable: true
disable-model-invocation: true
description: 'Runs the 7-stage onboarding interview that creates your vault, Core Identity, AI companion persona, and initial index.'
argument-hint: '[--step STAGE] [--reset]'
version: '3.0.0'
complexity: complex
context_layers: [1]
orchestrator: setup skill
plugin: maencof
---

# setup — maencof Onboarding Consultation



A 7-stage goal-driven dynamic interview for first-time maencof setup or Core Identity reset. Instead of a rigid questionnaire, the AI acts as a **"Professional Counselor"**—logical, empathetic, and structured. It helps you explore your knowledge management patterns and organically constructs your Core Identity schema.

## When to Use This Skill

- Immediately after installing maencof for the first time
- When you want to update Core Identity (values, boundaries, preferences) — use `--step` to re-run a specific stage
- When you need to change the knowledge tree path
- When manually resetting the Progressive Autonomy Level

## When to Use vs Adjacent Skills

- **`setup`** — one-time onboarding consultation. Runs a 7-stage "Professional Counselor" interview that constructs your Core Identity, synthesizes an AI companion persona, scaffolds Layer directories, and builds the initial index. Re-run a specific stage via `--step` or reset Core Identity via `--reset`.
- **`configure`** — ongoing configuration router. Scans, health-checks, and delegates to 5 sub-skills (bridge, instruct, rule, lifecycle, checkup) for post-onboarding environment drift.

Rule of thumb: vault does not yet exist, or Core Identity needs reset → `setup`. Vault exists and something needs tuning → `configure`.

## 7-Stage Consultation Flow

→ Load **reference.md** when executing any stage to access schema definitions, guidelines, and output templates. **Important:** All interactions must follow the user's configured language. While templates are provided in English, translate them naturally at runtime.

### Stage 1 — Welcome & Space Initialization (Path Setup)

Capture the user's execution directory once as canonical absolute `vaultRoot`. Keep this value across all stages, `--step` resumes, and later directory changes. Announce it using T1-1 through T1-3; do not interview for a default path or use the MCP process CWD.

Before any scaffolding and **before any knowledge write**, compare canonical `kg_status.vaultPath` with `vaultRoot`. If they match, do not write connection settings. If the server is unavailable or points elsewhere:

1. Preview `node <pluginRoot>/bridge/setup-vault.cjs --host <claude|codex> --vault-root <vaultRoot>` using safely quoted absolute arguments.
2. Apply the authorized setup connection with the same arguments and `--apply`. The command uses the shared project MCP manager; it preserves unrelated servers, rejects foreign ownership/drift, and never writes user-scope settings. Do not manually overwrite a conflicting configuration.
3. Reconnect/reload the host and call the actual `kg_status` connection that subsequent writes will use. Verify `kg_status.vaultPath` again. If plugin and project servers coexist, select the verified project connection consistently. Stop knowledge writes if the host cannot select/override it; report the specific reconnect requirement. Never fall back to user scope or the old vault.

Use only `vaultRoot` for scaffolding, provisioning, trust-level, Core Identity, project directives and indexing. An existing `MAENCOF_VAULT_PATH` must not override this captured setup destination. Unsupported hosts require a supported project connection, not a guessed plugin directory.

- Re-running is non-destructive: detect existing vault documents/configuration and provision only missing files. Preserve Core Identity; only an explicit reset request may change its authorized scope.
- Also create the `.maencof/` cache directory and `.maencof-meta/` metadata directory.
- **Provision default config files**: After creating directories, provision all missing config files with defaults (insight-config.json, vault-commit.json, lifecycle.json, data-sources.json, auto-insight-stats.json, usage-stats.json). Display the list of provisioned files to the user.

### Stage 2 — Dynamic Identity Discovery (The Interview)

**Goal:** Through natural, empathetic conversation, collect the 5 key dimensions of the `CoreIdentitySchema` defined in `reference.md`. **Tool:** Use `AskUserQuestion` (type: `text` for open-ended, `choice` only when narrowing down is helpful).

Collect all five `CoreIdentitySchema` fields (Name, Interest, Values, Boundary, Style) one question at a time, using the user's answers to target only the remaining fields.

_Crucial:_ Maintain the persona of a professional counselor. Do NOT use medical or clinical terms like "diagnosis" or "patient". Be calm and structured.

### Stage 3 — AI Companion Proposal (Persona Synthesis)

Synthesize an AI companion persona based on the Stage 2 discovery. See `reference.md` § Stage 3 for the schema and per-turn budget contract.

1. **Synthesize Persona**: Holistically design a companion that acts as a perfect partner for the user's stated needs and work style. Fill the v2 companion schema — core fields (`name`, `greeting`) plus uniform `sections` (one per character axis: role, tone, taboos, principles, traits, origin, and any custom axis).
2. **Propose & Refine**: Present the proposed persona via `AskUserQuestion` with options:
   - **Use** — Save to `.maencof-meta/companion-identity.json` following the v2 Persistence Schema in reference.md § Stage 3. Enforce the per-turn budget gate (reference.md § Per-turn budget gate — the char cap across all `turn`/`both` sections) BEFORE writing; demote a section to `session` or add a shorter `brief` if it overflows.
   - **Regenerate** — Generate a new persona with a different approach
   - **Skip** — Do not create a companion identity; proceed to next stage
3. **Skip behavior**: If the user skips, do NOT add `companion-identity` to `completedSteps`. Proceed normally to Stage 4.
4. **Reset**: `--reset --companion` deletes the existing `companion-identity.json`, re-reads L1 documents for context, and re-synthesizes the persona.

### Stage 4 — Initial Knowledge Tree Scaffolding

Generate Layer 1 documents from the synthesized discovery. → Use templates T4-1, T4-2 from `reference.md`.

| File                     | Content                                               |
| ------------------------ | ----------------------------------------------------- |
| `01_Core/identity.md`    | Name, role (inferred), primary interest               |
| `01_Core/values.md`      | The 3 synthesized core values with brief explanations |
| `01_Core/boundaries.md`  | Absolute boundaries                                   |
| `01_Core/preferences.md` | Communication preferences                             |

Create the 4 markdown documents above with `mcp__maencof__create` (layer=1; tags AND gist required — every L1 document must include a one-line `gist`, or create rejects it). Note: `01_Core/trust-level.json` is created separately in Stage 5 — it is a pure JSON file and cannot use `mcp__maencof__create`, which requires layer/tags and always emits Frontmatter markdown.

Also create the Layer directories and sub-layer subdirectories:

- `02_Derived/`
- `03_External/`, `03_External/relational/`, `03_External/structural/`, `03_External/topical/`
- `04_Action/`
- `05_Context/` (flat — Layer 5 has no sub-directories)

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

**Creation method**: Write this JSON configuration only when missing, or when an explicit `--reset` authorizes resetting autonomy. Use the fixed absolute `vaultRoot` from Stage 1, with safe shell quoting; never reevaluate CWD or substitute an environment override:

```bash
echo '{"current_level":0,"interaction_count":0,"success_count":0,"last_escalation_date":null,"lock_status":false}' > '<vaultRoot>/01_Core/trust-level.json'
```

This direct configuration write is limited to this JSON file; do not bypass knowledge-document protections.

> Note: This `Bash` pattern applies only to `trust-level.json` (a JSON config file that cannot use `mcp__maencof__create`). Markdown L1 documents must always go through the `identity-guardian` agent.

### Stage 6 — Initial Index Build

Check index status with `mcp__maencof__kg_status`.

- If an existing markdown vault is present: suggest a full build and run `/maencof:build` after user confirmation.
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

| Tool                                   | Purpose                                              |
| -------------------------------------- | ---------------------------------------------------- |
| `AskUserQuestion`                      | Conduct the dynamic discovery interview (Stages 1–3) |
| `mcp__maencof__create`    | Create L1 documents (Stage 4)                        |
| `mcp__maencof__read`      | Verify existing L1 documents (Stage 4)               |
| `mcp__maencof__kg_status` | Check index status (Stage 6)                         |
| `Bash`                                 | Create/overwrite `trust-level.json` (Stage 5)        |

## Options

| Option                | Description                                                                             |
| --------------------- | --------------------------------------------------------------------------------------- |
| `--step <1-7>`        | Re-run a specific stage only                                                            |
| `--reset`             | Full reset (recreates `trust-level.json`; existing L1 markdown documents are preserved) |
| `--reset --companion` | Reset companion identity only (delete JSON → re-read L1 → re-synthesize)                |

## Error Handling

- **Invocation directory unavailable**: Stop and report the missing captured directory; do not choose another root.
- **`mcp__maencof__create` failure**: Report error and skip to next document; resume at failed stage on retry.
- **`identity-guardian` unavailable**: Proceed without L1 Frontmatter verification and note in completion summary.
- **Already initialized**: Preserve existing Core Identity and configuration, report what was reused, and resume only missing stages. Apply `--reset` only to its explicitly requested scope.

## Acceptance Criteria

- 4 documents in `01_Core/` + `trust-level.json` created.
- `02_Derived/`, `03_External/` (with `relational/`, `structural/`, `topical/`), `04_Action/`, `05_Context/` (flat) directories created.
- Progressive Autonomy Level 0 set.
- Stage 2 discovery covers all 5 CoreIdentitySchema fields (Name, Interest, Values, Boundary, Style).
- Companion identity synthesized and saved, or explicitly skipped.
