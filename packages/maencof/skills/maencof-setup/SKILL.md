---
name: maencof-setup
user_invocable: true
description: "[maencof:maencof-setup] Runs the 7-stage maencof onboarding wizard covering personal values, boundaries, preferences, and AI persona generation. Each stage is skippable and re-runnable via the --step flag."
argument-hint: "[--step STAGE] [--reset]"
version: "2.0.0"
complexity: complex
context_layers: [1]
orchestrator: maencof-setup skill
plugin: maencof
---

# maencof-setup — maencof Onboarding Wizard

A 7-stage interview-style wizard for first-time maencof setup or Core Identity reset.
Presents one question at a time; every stage can be skipped.

## When to Use This Skill

- Immediately after installing maencof for the first time
- When you want to update Core Identity (values, boundaries, preferences) — use `--step` to re-run a specific stage
- When you need to change the knowledge tree path
- When manually resetting the Progressive Autonomy Level

## 7-Stage Wizard Flow

→ Load **reference.md** when executing any stage to access output templates.

### Stage 1 — Welcome + Knowledge Space Path Setup

Collect the vault absolute path via AskUserQuestion.
→ Use templates T1-1, T1-2, T1-3 from reference.md.

- Default: `~/.maencof/`
- If the path does not exist, confirm whether to create it
- Also create the `.maencof/` cache directory and `.maencof-meta/` metadata directory
- **Provision default config files**: After creating directories, provision all missing
  config files with defaults (insight-config.json, vault-commit.json, lifecycle.json,
  data-sources.json, auto-insight-stats.json, usage-stats.json).
  Display the list of provisioned files to the user.

### Stage 2 — Core Identity Interview (minimum 5 questions)

Ask questions sequentially via AskUserQuestion. Each question is independent and can be skipped.
→ Use templates T2-Q1 through T2-Q10, T2-SKIP, T2-DONE from reference.md.

**Required set (5 questions with predefined options):**

1. **Name** — "어떤 이름으로 불러드릴까요?"
   - Options: ["본명 사용", "닉네임 입력", "나중에 정할게"]

2. **Core values** — "지식을 쌓고 관리할 때 가장 중요하게 생각하는 가치 3가지를 골라주세요."
   - Options (select up to 3): ["정확성", "실용성", "창의성", "체계성", "깊이", "폭넓음", "직관", "효율", "직접 입력"]

3. **Boundary** — "제가 절대 하지 말아야 할 행동이 있다면 하나만 알려주세요."
   - Options: ["허락 없이 파일 삭제 금지", "확인 없이 정보 공유 금지", "근거 없는 추측 금지", "직접 입력", "나중에 정할게"]

4. **Primary interest** — "요즘 가장 관심 있는 분야나 프로젝트가 무엇인가요?"
   - Options: ["AI/ML", "소프트웨어 개발", "독서/학습", "프로젝트 관리", "직접 입력"]

5. **Communication style** — "어떤 말투를 선호하세요?"
   - Options: ["간결하고 핵심만", "친근하고 대화하듯", "정중하고 격식있게", "직접 입력"]

**Optional set (5 questions, suggested after completing required):**

6. **Occupation/role** — Options: ["개발자", "연구자", "학생", "기획자/PM", "디자이너", "직접 입력", "건너뛰기"]
7. **Long-term goals** — Options: ["직접 입력", "건너뛰기"]
8. **Learning style** — Options: ["직접 해보기", "문서/책 읽기", "영상 시청", "토론/질문", "직접 입력", "건너뛰기"]
9. **Decision criteria** — Options: ["데이터/근거", "직관/경험", "효율/속도", "안정성/리스크", "직접 입력", "건너뛰기"]
10. **Daily routine** — Options: ["아침형", "저녁형", "불규칙", "직접 입력", "건너뛰기"]

See reference.md for full question text, hints, and notes for each question.

### Stage 3 — AI Companion Identity

Generate an AI companion persona based on the collected interview answers.
→ Use templates T3-1, T3-2 from reference.md. Load **examples.md** § Example 3 for sample output.

1. **Generate persona**: Map interview answers to `CompanionIdentitySchema` fields using the field generation rules in reference.md § T3-1. Every field has a deterministic mapping from interview answers.

2. **User approval**: Present the generated persona (template T3-2) via AskUserQuestion with 3 options:
   - **사용** — Save to `.maencof-meta/companion-identity.json`
   - **다시 생성** — Generate a new persona with different characteristics
   - **건너뛰기** — Do not create a companion identity; proceed to next stage

3. **Skip behavior**: If the user skips, do NOT add `companion-identity` to `completedSteps`. Proceed normally to Stage 4.

4. **Reset**: `--reset --companion` deletes the existing `companion-identity.json`, re-reads L1 documents for context, and regenerates the persona.

### Stage 4 — Initial Knowledge Tree Scaffolding

Generate Layer 1 documents from the collected interview answers.
→ Use templates T4-1, T4-2 from reference.md for document content and completion report.

| File | Content |
|------|---------|
| `01_Core/identity.md` | Name, title, identity |
| `01_Core/values.md` | Core values |
| `01_Core/boundaries.md` | Absolute boundaries |
| `01_Core/preferences.md` | Communication preferences |

Create the 4 markdown documents above with the `create` MCP tool (layer=1, tags required).
Note: `01_Core/trust-level.json` is created separately in Stage 5 — it is a pure JSON file and cannot use `create` (which requires layer/tags and always generates Frontmatter markdown).

Also create the Layer directories and sub-layer subdirectories:
- `02_Derived/`
- `03_External/`, `03_External/relational/`, `03_External/structural/`, `03_External/topical/`
- `04_Action/`
- `05_Context/`, `05_Context/buffer/`, `05_Context/boundary/`

Delegate to the identity-guardian agent to verify Frontmatter rule compliance for the generated L1 documents via read.

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

**Creation method** (layer-guard considerations):
- **Initial setup** (first run): Use the Write tool. The vault structure does not exist yet, so `isMaencofVault(cwd)` returns `false` and the layer-guard hook is inactive.
- **`--reset` mode**: Use the Bash tool (`echo '{"current_level":0,...}' > 01_Core/trust-level.json`). The vault already exists, so the layer-guard would block Write/Edit on `01_Core/`. Bash bypasses the `Write|Edit` matcher in hooks.json.

### Stage 6 — Initial Index Build

Check index status with the `kg_status` MCP tool.
→ Use templates T6-1, T6-2 from reference.md.

- If an existing markdown vault is present: suggest a full build and run `/maencof:maencof-build` after user confirmation
- If new: run a lightweight build with the generated L1 documents

### Stage 7 — Completion Guide

Display a completion message with next-step guidance.
→ Use template T7-1 from reference.md.

## Agent Collaboration

```
setup skill starts
  -> Stage 4: identity-guardian agent — review/protect L1 documents after creation
  -> Stage 6: invoke build skill (with user approval)
  -> setup skill: provide completion summary and guidance
```

## Available MCP Tools

| Tool | Purpose |
|------|---------|
| `create` | Create L1 documents (Stage 4) |
| `read` | Verify existing L1 documents (Stage 4, via identity-guardian) |
| `kg_status` | Check index status (Stage 6) |

## Available Native Tools

| Tool | Purpose |
|------|---------|
| `AskUserQuestion` | Collect user input during interview (Stages 1–3) |
| `Write` | Create `trust-level.json` during initial setup (Stage 5, first run only) |
| `Bash` | Overwrite `trust-level.json` in `--reset` mode to bypass layer-guard (Stage 5) |

## Options

```
/maencof:maencof-setup [--step <stage>] [--reset]
```

| Option | Description |
|--------|-------------|
| `--step <1-7>` | Re-run a specific stage only |
| `--reset` | Full reset (recreates trust-level.json; existing L1 markdown documents are preserved) |
| `--reset --companion` | Reset companion identity only (delete JSON → re-read L1 → regenerate) |

## Error Handling

- **Vault path does not exist**: ask user to confirm creation before proceeding
- **create failure**: report error and skip to next document; resume at failed stage on retry
- **identity-guardian unavailable**: proceed without L1 Frontmatter verification and note in completion summary
- **Already initialized**: warn that re-running will overwrite existing Core Identity documents; require explicit `--reset` confirmation

## Acceptance Criteria

- 4 documents in `01_Core/` + `trust-level.json` created
- `02_Derived/`, `03_External/` (with `relational/`, `structural/`, `topical/`), `04_Action/`, `05_Context/` (with `buffer/`, `boundary/`) directories created
- Progressive Autonomy Level 0 set
- Skip responses allowed (all stages)
- Companion identity generated with deterministic field mappings (or skipped)

## Resources

### reference.md

Output templates and field generation rules for all 7 stages. Contains:

- Korean output templates (T1-1 through T7-1) for every user-facing message
- Interview question text, hints, and predefined options (T2-Q1 through T2-Q10)
- CompanionIdentitySchema field generation rules with mapping table (T3-1)
- L1 document content templates with frontmatter (T4-1)

Load reference.md when executing any setup stage.

### examples.md

Concrete usage examples and sample outputs:

- Example 1: Complete interview session with predefined option selections
- Example 2: Skip flow showing boundary skip + companion skip behavior
- Example 3: companion-identity.json with full mapping trace from interview answers

Load examples.md for concrete patterns and sample outputs.
