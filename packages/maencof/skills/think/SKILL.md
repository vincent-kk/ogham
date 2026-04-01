---
name: think
user_invocable: true
description: Automatically analyzes ambiguous requirements using Tree of Thoughts methodology. Generates 3-5 candidate interpretations, evaluates each on a 100-point scale, and selects the optimal approach with rationale and backtrack plans.
version: 1.0.0
complexity: medium
context_layers: []
orchestrator: think skill
plugin: maencof
---

# ToT Requirements Engine

## When to Use

### Auto-trigger Conditions

Claude automatically invokes this skill when:

- A feature request can be interpreted in multiple distinct ways
- Requirements have ambiguous scope requiring comparative evaluation of candidates
- An architectural decision needs trade-off analysis across multiple approaches
- The user provides a broad goal without specifying the implementation path

### Manual Invocation

```
/maencof:think [requirement or feature request]
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

| Criterion                 | Points | Description                                   |
| ------------------------- | ------ | --------------------------------------------- |
| Implementation Complexity | 30     | Lower complexity earns higher score           |
| Requirements Coverage     | 30     | Degree to which user needs are met            |
| UX Quality                | 20     | Ease of use and interaction quality           |
| Maintainability           | 10     | Ease of future modification                   |
| Team Capability Fit       | 10     | Alignment with existing team skills and stack |

## Score Interpretation

- **85-100** - Certain: strong recommendation, proceed immediately
- **75-84** - Very Feasible: safe choice, low risk
- **70-74** - Feasible: viable, proceed with care
- **60-69** - Caution: risk present, mitigation plan required
- **Below 60** - Not Recommended: seek alternative or redesign

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
