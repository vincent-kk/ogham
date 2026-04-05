# ToT Requirements Engine - Reference

## Step 1: Candidate Generation (Detail)

**Goal**: Produce 3-5 concrete, implementable interpretations of the requirement. Cover a range of complexity levels (simple to complex) and different implementation strategies.

**Guidelines**:
- Each interpretation must be actionable — no purely theoretical proposals
- Include at least one simple/low-risk option and one richer/higher-UX option
- Label interpretations A, B, C, D, E for easy reference throughout the process

**Example**:

```
User Request: "Users should be able to select a time slot"

Interpretation A: Simple checkbox list of predefined time slots
Interpretation B: Drag-based time range selector on a timeline
Interpretation C: Calendar view with visual block selection
Interpretation D: Start/end time input fields with validation
```

---

## Step 2: Evaluation (Detail)

Score every candidate against all 5 criteria. Scores are integers. Sum the five scores to produce the total out of 100.

**Scoring rubric per criterion**:

| Criterion | Full Score | Guidance |
|---|---|---|
| Implementation Complexity | 30 | 28-30 = trivial; 20-27 = moderate; 10-19 = high effort; <10 = extremely complex |
| Requirements Coverage | 30 | 28-30 = fully meets all user needs; 20-27 = mostly meets; 10-19 = partial; <10 = minimal |
| UX Quality | 20 | 18-20 = intuitive and efficient; 12-17 = acceptable; 6-11 = awkward; <6 = poor |
| Maintainability | 10 | 9-10 = simple structure, easy to change; 6-8 = manageable; <6 = fragile or tangled |
| Team Capability Fit | 10 | 9-10 = team has direct experience; 6-8 = learnable quickly; <6 = unknown territory |

**Full Scoring Example**:

```markdown
**Interpretation A — Simple checkbox list**

- Implementation Complexity: 28/30 (trivial HTML, no library needed)
- Requirements Coverage:    20/30 (covers basic case only, no range selection)
- UX Quality:               12/20 (intuitive but limited, poor for many slots)
- Maintainability:           9/10 (simple structure, easy to modify)
- Team Capability Fit:      10/10 (standard HTML/CSS, no learning curve)
- **Total: 79/100 — Feasible**

**Interpretation B — Drag-based timeline selector**

- Implementation Complexity: 20/30 (medium complexity, requires react-dnd)
- Requirements Coverage:    28/30 (excellent UX for time range selection)
- UX Quality:               18/20 (intuitive and efficient for users)
- Maintainability:           7/10 (state management adds complexity)
- Team Capability Fit:       9/10 (team has react-dnd experience)
- **Total: 82/100 — Very Feasible** ✅

**Interpretation C — Calendar view with block selection**

- Implementation Complexity: 14/30 (high effort, custom calendar rendering)
- Requirements Coverage:    25/30 (good coverage, visual clarity)
- UX Quality:               16/20 (clear but heavier interaction)
- Maintainability:           5/10 (significant rendering logic to maintain)
- Team Capability Fit:       8/10 (calendar libs are familiar)
- **Total: 68/100 — Caution**
```

---

## Step 3: Selection + Lookahead (Detail)

**Selection**: Identify the highest-scoring interpretation. If there is a tie, apply the tiebreaker: reusability > single responsibility > efficiency.

**Rationale**: Write 3-5 sentences explaining *why* this interpretation wins. Reference specific score advantages and project context.

**Lookahead**: State the immediate next decision this choice will force (e.g., library selection, mobile strategy). List 2-3 anticipated risks.

**Backtrack Plan**: Define the trigger condition (time or metric based) and the fallback interpretation. Estimate recovery time.

**Full YAML Decision Record Example**:

```yaml
decision:
  selected_interpretation:
    id: "B"
    description: "Drag-based timeline selector using react-dnd"
    score: 82
    rationale: >
      Interpretation B achieves the best balance of UX quality and requirements
      coverage (82/100). The team already has react-dnd experience, reducing
      ramp-up risk. Although complexity is higher than Interpretation A, the
      superior user experience justifies the investment for a scheduling feature
      that users will interact with frequently.

  alternatives:
    - id: "A"
      description: "Simple checkbox list"
      score: 79
      fallback_condition: "Switch if drag implementation is blocked for more than 2 days"

    - id: "C"
      description: "Calendar view with block selection"
      score: 68
      rejected_reason: "High implementation complexity relative to UX benefit; team lacks calendar rendering experience"

  lookahead:
    next_decision: "Drag library selection — react-dnd vs react-beautiful-dnd vs @dnd-kit/core"
    expected_complexity: "Medium"
    risks:
      - "Mobile touch support may require a separate interaction model"
      - "Performance degradation when rendering many time slots simultaneously"
      - "Accessibility (keyboard navigation) for drag interactions is non-trivial"

  backtrack_plan:
    trigger: "No meaningful progress after 2 days of implementation, or performance benchmark missed"
    action: "Switch to Interpretation A (simple checkbox list)"
    estimated_recovery_time: "1 day"
```

---

## Integration Workflow

This skill connects with related skills in a planning pipeline:

**Upstream (inputs)**:
- `project-detector` — provides tech stack, framework, and team capability context
- `yaml-generator` — supplies structured project constraints

**Downstream (consumers)**:
- `ears-documenter` — converts the selected interpretation into EARS-format requirement statements
- `design-architect` — incorporates the selected interpretation into technical design decisions

---

## Standard Output Template

Use this structure for every response:

```markdown
## ToT Requirements Interpretation Analysis

### Original Request

"{user's original request text}"

### Candidate Interpretations

**Interpretation A**: [brief description]
**Interpretation B**: [brief description]
**Interpretation C**: [brief description]
[**Interpretation D**: [brief description] — if applicable]
[**Interpretation E**: [brief description] — if applicable]

### Evaluation Results

[Scored evaluation block for each interpretation — see Step 2 format above]

### Final Selection

**Selected**: Interpretation [X] — [description]
**Score**: [total]/100 — [score label]
**Rationale**: [3-5 sentences]

### Lookahead

- **Next Decision**: [what must be decided next]
- **Risks**: [2-3 bullet points]

### Backtrack Plan

- **Fallback**: Interpretation [Y] ([score]/100)
- **Trigger Condition**: [specific trigger]
- **Recovery Time**: [estimate]
```

---

## Detailed Error Handling

```yaml
error_handling:
  severity_high:
    conditions:
      - User request is too vague to produce any concrete interpretation
      - Project context is missing (.project-structure.yaml not found)
      - All candidates score below 60 (highest score under 60)
      - Fewer than 3 candidate interpretations could be generated
      - YAML output cannot be parsed or structured correctly
    action: |
      CRITICAL ERROR — Halt requirement interpretation.
      1. Request clarification: ask user to rewrite the requirement with more specificity
         (e.g., "improve UI" → "add drag-to-select time slot UI to the booking screen")
      2. Verify project context: confirm .project-structure.yaml exists and is readable
      3. If all candidates score below 60: regenerate with different interpretation angles
         or escalate to design-architect for architectural guidance
      4. Do not produce a partial output — retry after blockers are resolved
    examples:
      - condition: "Request too vague"
        message: "ERROR: Cannot generate interpretations — request is underspecified"
        recovery: "Ask: 'Please describe the specific user action, screen, and desired outcome'"
      - condition: "All candidates below 60"
        message: "ERROR: All interpretations scored below 60 (highest: 58/100)"
        recovery: "Regenerate candidates with different framing, or consult design-architect"

  severity_medium:
    conditions:
      - One or more evaluation criteria cannot be scored (missing data)
      - Lookahead prediction is uncertain (insufficient context)
      - Backtrack plan cannot be defined (only one viable interpretation)
      - Two or more interpretations are tied on total score
      - Team capability data is absent
    action: |
      WARNING — Proceed with partial evaluation; flag all gaps.
      1. Missing criteria: assign default score of 50; note in output as estimated
      2. Uncertain lookahead: mark as "Uncertain — insufficient context" and list what
         information would resolve the uncertainty
      3. No backtrack option: note "No fallback defined — single viable path"
      4. Tie: apply tiebreaker (reusability > SRP > efficiency); document which rule was applied
      5. Missing team capability: assume "Average (50pts)" and flag for manual review
    fallback_values:
      evaluation_score: 50
      lookahead: "Uncertain — insufficient context"
      backtrack_plan: "No fallback defined — single viable path"
      team_capability: 50
    examples:
      - condition: "Criteria calculation failed"
        message: "WARNING: 'Maintainability' could not be evaluated (no codebase context)"
        fallback: "Set to 50/10 (estimated) — recommend manual review after evaluation"
      - condition: "Tied scores"
        message: "WARNING: Interpretations A and B both scored 82/100"
        fallback: "Tiebreaker applied: reusability — Interpretation A selected"

  severity_low:
    conditions:
      - Optional metadata fields are absent
      - YAML output has minor formatting issues
      - Lookahead section is brief due to limited project context
      - Interpretation descriptions are shorter than ideal
    action: |
      INFO — Minor gap; proceed normally.
      - Omit missing optional fields without comment
      - Auto-correct minor YAML formatting issues
      - Provide abbreviated lookahead when context is limited; note brevity
      - Proceed with minimal descriptions if full detail is unavailable
    examples:
      - condition: "Metadata absent"
        auto_handling: "Omit optional metadata fields; core evaluation output is unaffected"
      - condition: "Brief lookahead"
        auto_handling: "Provide top-level next decision only; skip risk detail if context insufficient"
```
