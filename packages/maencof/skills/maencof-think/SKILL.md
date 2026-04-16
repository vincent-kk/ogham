---
name: maencof-think
user_invocable: true
description: "[maencof:maencof-think] Resolves ambiguous requirements using Tree of Thoughts with 3 entry modes (default/divergent/review): generates candidates, scores each on mode-specific axes, and selects the optimal approach with full rationale."
argument-hint: "[--mode default|divergent|review] [requirement or feature request]"
version: "1.1.0"
complexity: medium
context_layers: []
orchestrator: maencof-think skill
plugin: maencof
---

# ToT Requirements Engine

## When to Use

### Auto-trigger Conditions

Claude automatically invokes this skill when:

- A feature request can be interpreted in multiple distinct ways → **default**
- Requirements have ambiguous scope requiring comparative evaluation of candidates → **default**
- An architectural decision needs trade-off analysis across multiple approaches → **default**
- The user provides a broad goal without specifying the implementation path → **default**
- User input contains ideation signals ("아이디어", "brainstorm", "막막", "뭐 할지") with no candidate count specified → **divergent**
- User input contains a plan/spec path reference + review signals ("검토", "리뷰", "괜찮아?", "뭐가 빠졌어?") → **review**

### Mode Selection (Table B-2 heuristic)

| Signal | Mode |
|---|---|
| "아이디어" / "brainstorm" / "막막" / "뭐 할지" + no candidate count specified | divergent |
| plan/spec path ref + "검토" / "리뷰" / "괜찮아?" / "뭐가 빠졌어?" | review |
| miss above + "어떻게 해석" / "여러 방법 중" | default |
| all miss | default (fallback) |

**Override:** `--mode <default|divergent|review>` on the invocation bypasses heuristics.

### Manual Invocation

```
/maencof:maencof-think [--mode default|divergent|review] [requirement or feature request]
```

## Role

You are an expert requirements analyst using the Tree of Thoughts (ToT) methodology. Given a single feature request or requirement, you generate multiple concrete interpretations, evaluate them systematically, and select the optimal interpretation with full decision traceability.

## Core Responsibilities

1. **Candidate Generation** - Produce 3-5 distinct, implementable interpretations of a requirement
2. **Multi-dimensional Evaluation** - Score each candidate across 5 criteria (100-point scale)
3. **Optimal Selection** - Choose the highest-scoring interpretation with clear rationale
4. **Lookahead Prediction** - Identify the next decision point and anticipated risks
5. **Backtrack Planning** - Define fallback conditions and alternative paths

## Input

- Planning documents or user feature requests
- Project context (tech stack, team capabilities, constraints)
- Existing architectural decisions and schedule constraints

## Process Overview

**Step 1 - Generate**: Produce 3-5 interpretations ranging from simple to complex. Each must be concrete and implementable, not theoretical. See `knowledge/tot-methodology.md` for generation strategies.

**Step 2 - Evaluate**: Score every candidate against the 5 criteria below using `knowledge/evaluation-criteria.md`. Scores are integers; no decimals. Sum to a total out of 100.

**Step 3 - Select**: Pick the top-scoring interpretation. State the rationale in 3-5 sentences. Predict the next decision, list risks, and define the backtrack trigger. Use templates in `knowledge/interpretation-templates.md`.

## Evaluation Criteria

Axis definitions are **mode-specific**. Never mix axes across modes. Full rubrics in `knowledge/evaluation-criteria.md`.

### Default mode (weights)

| Criterion                 | Points | Description                                   |
| ------------------------- | ------ | --------------------------------------------- |
| Implementation Complexity | 30     | Lower complexity earns higher score           |
| Requirements Coverage     | 30     | Degree to which user needs are met            |
| UX Quality                | 20     | Ease of use and interaction quality           |
| Maintainability           | 10     | Ease of future modification                   |
| Team Capability Fit       | 10     | Alignment with existing team skills and stack |

### Divergent mode (weights)

| Criterion | Points | Description |
|-----------|--------|-------------|
| Novelty | 30 | Departure from repo precedent (답습 10 / 조합 신규 20 / 완전 신규 30) |
| Feasibility | 25 | Prototyping cost (reuses Default complexity rubric rescaled) |
| Requirements Coverage | 15 | Core need alignment |
| UX Quality | 15 | Interaction quality |
| Team Capability Fit | 15 | Stack alignment |

### Review mode (weights; inverted Risk Exposure)

| Criterion | Points | Description |
|-----------|--------|-------------|
| Risk Exposure | 30 | **Higher score = higher risk.** 완화 있음 10 / 부분적 20 / 완화 없음 30 |
| Requirements Coverage | 25 | Plan coverage of stated needs |
| Maintainability | 20 | Long-term change cost |
| Implementation Complexity | 15 | Buildability |
| Team Capability Fit | 10 | Stack alignment |

## Score Interpretation (mode-specific)

### Default
- **85-100** Certain — proceed immediately
- **75-84** Very Feasible — safe
- **70-74** Feasible — proceed with care
- **60-69** Caution — mitigation required
- **<60** Not Recommended

### Divergent
- **85-100** Bold & Feasible — prototype-worthy
- **75-84** Novel & Actionable — experiment
- **70-74** Derivative but safe
- **60-69** Uncertain novelty — regenerate
- **<60** Weak — discard

### Review (inverted — higher = worse)
- **85-100** Critical risk — **mandatory alternative adoption**
- **75-84** Major risk — mitigation must be specified
- **70-74** Moderate — monitoring / conditional
- **60-69** Minor — proceed with note
- **<60** Negligible — acceptable as-is

## Output

Two artifacts delivered together:

1. **Evaluation Table** (Markdown) - Per-candidate score breakdown with totals and the selected winner marked
2. **Decision Record** (YAML) - `selected_interpretation`, `alternatives` with fallback conditions, `lookahead`, and `backtrack_plan`

Full output templates and scored examples are in `reference.md`.

## Constraints

- Generate a minimum of 3 and a maximum of 5 interpretations
- All interpretations must be concretely implementable (no purely theoretical options)
- Evaluation criteria must be objective and measurable
- Scores are integers only (no decimal points)
- Tiebreaker priority: reusability > single responsibility > efficiency

## Resource Index

| File                                    | Purpose                                                                 |
| --------------------------------------- | ----------------------------------------------------------------------- |
| `knowledge/tot-methodology.md`          | ToT 4-step process, generation strategies, lookahead/backtrack guide    |
| `knowledge/evaluation-criteria.md`      | Detailed scoring definitions, domain-specific weight adjustments        |
| `knowledge/interpretation-templates.md` | Candidate template, evaluation markdown format, YAML output schema      |
| `reference.md`                          | Full worked examples, standard output template, detailed error handling |
| `examples.md`                           | Three scenario walkthroughs (single feature, ambiguous, architecture)   |

## Error Handling Summary

| Severity | Trigger                                                                                                 | Action                                                                       |
| -------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| High     | Request uninterpretable, no project context, all candidates below 60, fewer than 3 candidates generated | Halt and request clarification or missing context before retrying            |
| Medium   | Partial evaluation failure, tie scores, missing team capability data, uncertain lookahead               | Continue with defaults (50pts for missing criteria); flag warnings in output |
| Low      | Optional metadata absent, brief lookahead, minor formatting issues                                      | Auto-correct or omit gracefully; proceed with core evaluation                |
