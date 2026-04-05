# Interpretation Templates

## Interpretation Candidate Writing Template

### Basic Format

```markdown
### Interpretation {ID}: {Concise Title}

**Description**: {Specific implementation method, 2-3 lines}

**Implementation Elements**:
- UI: {Components/libraries to use}
- State Management: {State management approach}
- Data Flow: {Data handling method}
- Notes: {Points to be careful about, constraints}

**Advantages**:
- {Advantage 1}
- {Advantage 2}
- {Advantage 3}

**Disadvantages**:
- {Disadvantage 1}
- {Disadvantage 2}
```

### Example

```markdown
### Interpretation A: Simple Checkbox List

**Description**: Time slots are listed vertically as checkboxes, and users select them by clicking. Uses Ant Design Mobile's Checkbox component.

**Implementation Elements**:
- UI: Ant Design Mobile Checkbox.Group
- State Management: Jotai atom (selectedTimeSlots: string[])
- Data Flow: checkbox onChange → atom update → save button activation
- Notes: Virtual scroll should be considered when there are 100+ time slots

**Advantages**:
- Very simple to implement (1-2 hours)
- Standard UI pattern, no user learning required
- Perfect mobile touch event support
- Excellent accessibility (keyboard, screen reader)

**Disadvantages**:
- Inconvenient when selecting many time slots (click one by one)
- Inefficient for selecting continuous time ranges
- Lacks visual intuitiveness
```

## Evaluation Table Template

### Markdown Format

```markdown
## Evaluation Results

| Interpretation | Implementation Complexity (30) | Requirements Satisfaction (30) | UX Quality (20) | Maintainability (10) | Team Capability (10) | **Total** | **Rating** |
|----------------|-------------------------------|-------------------------------|-----------------|---------------------|---------------------|-----------|------------|
| A    | 28               | 20                  | 12           | 9              | 10          | **79**   | Feasible   |
| B    | 20               | 28                  | 18           | 7              | 9           | **82**   | Definitely ✅ |
| C    | 15               | 25                  | 17           | 6              | 5           | **68**   | Caution |
| D    | 27               | 18                  | 10           | 8              | 10          | **73**   | Feasible   |

### Detailed Evaluation

**Interpretation A Evaluation**:
- Implementation Complexity: 28/30 (very simple - standard components only)
- Requirements Satisfaction: 20/30 (basic features only, range selection difficult)
- UX Quality: 12/20 (intuitive but inefficient)
- Maintainability: 9/10 (simple structure, easy to change)
- Team Capability: 10/10 (standard React knowledge only required)
- **Total: 79/100 (Feasible)**

**Interpretation B Evaluation**:
- Implementation Complexity: 20/30 (medium - react-dnd library required)
- Requirements Satisfaction: 28/30 (excellent UX, convenient range selection)
- UX Quality: 18/20 (intuitive and efficient, possible touch issues)
- Maintainability: 7/10 (complex DnD state management)
- Team Capability: 9/10 (team has React DnD experience)
- **Total: 82/100 (Definitely)** ✅ **Selected**

**Interpretation C Evaluation**:
- Implementation Complexity: 15/30 (complex - calendar library + custom logic)
- Requirements Satisfaction: 25/30 (good UX, visually excellent)
- UX Quality: 17/20 (visually excellent but requires learning)
- Maintainability: 6/10 (complex calendar integration)
- Team Capability: 5/10 (no experience with calendar library)
- **Total: 68/100 (Caution)**

**Interpretation D Evaluation**:
- Implementation Complexity: 27/30 (simple - basic input field)
- Requirements Satisfaction: 18/30 (minimal features, poor UX)
- UX Quality: 10/20 (inconvenient, causes mistakes)
- Maintainability: 8/10 (simple)
- Team Capability: 10/10 (basic HTML)
- **Total: 73/100 (Feasible)**
```

## Decision Record Template (YAML)

```yaml
decision_record:
  # Basic Information
  date: "YYYY-MM-DD"
  decision_id: "REQ-{feature}-001"
  context: |
    {Background of requirements analysis}
    {Project constraints}

  # Selected Interpretation
  selected_interpretation:
    id: "B"
    title: "Drag-based time range selection"
    score: 82
    rating: "Definitely"
    rationale: |
      Highest UX and requirements satisfaction scores (28+18=46 pts)
      Team has React DnD library experience (9 pts)
      Implementation complexity within acceptable range (20 pts)
      Maintainability concerns can be mitigated with documentation (7 pts)

  # Alternative Interpretations
  alternatives:
    - id: "A"
      title: "Simple Checkbox"
      score: 79
      rating: "Feasible"
      role: "Backtracking alternative"
      fallback_condition: "No progress for 2+ days during drag implementation or mobile touch issues cannot be resolved"

    - id: "C"
      title: "Calendar View"
      score: 68
      rating: "Caution"
      rejected_reason: "Low effect relative to complexity, team has no experience"

    - id: "D"
      title: "Input Field"
      score: 73
      rating: "Feasible"
      rejected_reason: "Poor UX, high probability of causing user mistakes"

  # Lookahead
  lookahead:
    next_decision:
      title: "Drag library selection"
      options: ["react-dnd", "react-beautiful-dnd", "@dnd-kit/core"]
      expected_complexity: "Medium"
      estimated_time: "1 day"

    anticipated_risks:
      - risk: "Mobile touch event support issues"
        probability: "Medium"
        impact: "High"
        mitigation: "Prioritize mobile testing early"

      - risk: "Rendering performance issues with large numbers of time slots"
        probability: "Low"
        impact: "Medium"
        mitigation: "Apply virtual scroll"

      - risk: "Accessibility (keyboard navigation)"
        probability: "Medium"
        impact: "Medium"
        mitigation: "Add keyboard event handlers"

    dependencies:
      - "React 18+ version required"
      - "TypeScript configuration (strict mode)"
      - "Jotai state management setup"

  # Backtrack Plan
  backtrack_plan:
    trigger_conditions:
      - "2 days elapsed since implementation start but basic drag behavior not complete"
      - "Blocked for 1+ day due to mobile touch event issues"
      - "Performance target missed (rendering >500ms)"
      - "Accessibility issues cannot be resolved"

    alternative:
      id: "A"
      title: "Simple Checkbox"
      score: 79
      advantages:
        - "Implementable within 1 day"
        - "No mobile touch issues"
        - "Perfect accessibility support"

    transition_cost:
      time_lost: "2-3 days already invested"
      code_reusable: "State management logic reusable"
      recovery_time: "1 day"
      total_delay: "2-3 days"

    decision_criteria:
      - "Schedule pressure (within 2 weeks of release)"
      - "Insufficient team resources"
      - "Risk cannot be accepted"

  # Tracking Information
  tracking:
    implementation_start: null
    implementation_end: null
    actual_complexity: null
    lessons_learned: null
    backtrack_executed: false
```

## Lookahead Template

### Simple Format
```markdown
**Lookahead (Next Decision Forecast)**:
- Next decision: {Specific next choice}
- Expected complexity: {Low|Medium|High}
- Risks: {2-3 anticipated issues}
- Dependencies: {Required prerequisite work}
```

### Detailed Format
```markdown
**Lookahead (Next Decision Forecast)**:

### Next Decision Points
1. **Drag library selection**
   - Options: react-dnd vs react-beautiful-dnd vs @dnd-kit/core
   - Evaluation criteria: TypeScript support, mobile compatibility, performance
   - Expected time: half a day (research) + 1 day (PoC)

2. **Mobile support strategy**
   - Options: responsive vs separate mobile UI vs hybrid
   - Evaluation criteria: development cost, UX quality
   - Expected time: 1-2 days

### Anticipated Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Mobile touch event not supported | Medium | High | Prioritize early mobile testing |
| Performance issues (100+ time slots) | Low | Medium | Apply virtual scroll |
| Accessibility issues | Medium | Medium | Add keyboard handlers |

### Required Dependencies
- React 18+ (already satisfied ✅)
- TypeScript strict mode (setup required ⚠️)
- Jotai atoms structure design (not yet complete ❌)
```

## Backtrack Plan Template

### Simple Format
```markdown
**Backtrack Plan**:
- Alternative: {2nd-ranked interpretation ID and name}
- Trigger conditions: {When to switch}
- Expected loss: {Time/cost}
- Recovery time: {Time required to switch to alternative}
```

### Detailed Format
```markdown
**Backtrack Plan**:

### Alternative Interpretation
- **ID**: A
- **Title**: Simple Checkbox List
- **Score**: 79/100 (Feasible)
- **Advantages (vs selected B)**:
  * Simple to implement (1-2 days)
  * No mobile issues
  * Perfect accessibility

### Trigger Conditions (switch if any one applies)
1. **Schedule trigger**:
   - 2 days elapsed since implementation start but basic drag behavior not complete
   - Not complete 1 week before release

2. **Technical trigger**:
   - Blocked for 1+ day due to mobile touch event issues
   - Performance target missed (first render >500ms, interaction >100ms)
   - Cannot meet accessibility WCAG 2.1 AA standard

3. **Resource trigger**:
   - Team member absence makes React DnD support impossible
   - Priority change shortens development time to 1 day

### Transition Cost and Recovery
| Item | Detail |
|------|--------|
| **Time loss** | 2-3 days already invested |
| **Reusable code** | Jotai atom, timeslot data structure, save API call logic |
| **Discarded code** | DnD-related components and event handlers |
| **Recovery time** | 1 day (checkbox UI is very simple) |
| **Total delay** | 2-3 days (loss) - not a complete rewrite thanks to reusable code |

### Decision Criteria
Priority to consider when deciding to switch:
1. **Schedule pressure** (within 2 weeks of release) → switch immediately
2. **Technical difficulty** (no solution visible) → try 1 more day then switch
3. **Quality standard** (performance/accessibility not met) → review if mitigation is possible then decide
```

## Integrated Output Example

```markdown
# ToT Requirements Interpretation Analysis: Time Slot Selection Feature

## Original Request
"Users must be able to vote by selecting available time slots"

## Project Context
- Tech stack: React 18 + TypeScript + Jotai + Ant Design Mobile
- Team composition: 2 Frontend developers (1 with React DnD experience)
- Schedule: 1 week
- Constraints: Mobile-first responsive design

---

## Interpretation Candidate Generation

[Detailed description of Interpretations A, B, C, D]

---

## Evaluation Results

[Evaluation table + detailed evaluation]

---

## Final Selection

**Selected**: Interpretation B (Drag-based time range selection)
**Score**: 82/100 (Definitely) ✅
**Rationale**:
- Highest UX and requirements satisfaction scores (28+18=46 pts)
- Team has React DnD library experience (9 pts)
- Implementation complexity within acceptable range (20 pts)
- Maintainability concerns can be mitigated with documentation (7 pts)

---

## Lookahead (Next Decision Forecast)

[Detailed Lookahead]

---

## Backtrack Plan

[Detailed Backtrack Plan]

---

## YAML Output (For Programmatic Use)

```yaml
[YAML decision record]
```

---

**Next step**: Pass selected Interpretation B to the `ears-documenter` skill to write EARS format requirements documentation
