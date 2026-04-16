# Tree of Thoughts Methodology

## Overview

Tree of Thoughts (ToT) is a decision-making framework that systematically explores and evaluates multiple solution approaches for a single problem to make the optimal choice.

## 4-Step Process

### Step 1: Thought Generation

**Purpose**: Derive diverse solution approaches for the problem

**Methods**:
- **Divergent Thinking**: Approach from as many different perspectives as possible
- **Complexity Spectrum**: Include methods ranging from simple to complex
- **Feasibility Verification**: All candidates must be actually implementable

**Number of Candidates** (default mode):
- Simple problems: 3
- Medium complexity: 4
- Complex problems: 5

#### Mode-specific Generation

| Mode | Candidate Range | Generation Focus | Output |
|------|-----------------|-------------------|--------|
| **default** | 3-5 | Implementable interpretations across a complexity spectrum | evaluation table + Decision Record YAML |
| **divergent** | 5-8 | Maximize novelty and cross-domain variation; include speculative prototypes | candidate list + top 3 rationale (remaining summarized) |
| **review** | 3-5 (risks/alternatives) | Surface risks in the referenced plan/spec and pair each with a mitigation alternative | risk table + mitigation alternatives + minimum 3 alternatives |

#### Application by Entry Mode

- **default**: apply Strategies A/B/C below. Evaluate with Default Mode rubric in `evaluation-criteria.md`.
- **divergent**: apply Strategy D (Novelty-first, see below). Evaluate with Divergent Mode rubric (Novelty 30 / Feasibility 25 / Requirements 15 / UX 15 / Team 15).
- **review**: apply Strategy E (Risk-first, see below). Evaluate with Review Mode rubric (Risk Exposure 30 / Requirements 25 / Maintainability 20 / Complexity 15 / Team 10). **Inverted polarity**: higher Risk Exposure score = higher risk.

Mode selection (Table B-2 heuristic; `--mode` overrides):

| Signal | Mode |
|--------|------|
| "아이디어" / "brainstorm" / "막막" / "뭐 할지" + no candidate count specified | divergent |
| plan/spec path ref + "검토" / "리뷰" / "괜찮아?" / "뭐가 빠졌어?" | review |
| miss above + "어떻게 해석" / "여러 방법 중" | default |
| all miss | default (fallback) |

**Generation Strategies**:

#### Strategy A: Complexity-Based
```
Candidate 1: Minimum features (MVP)
Candidate 2: Basic features (Standard)
Candidate 3: Advanced features (Advanced)
Candidate 4: Full features (Full-featured)
```

#### Strategy B: Approach-Based
```
Candidate 1: Use existing library
Candidate 2: Pure custom implementation
Candidate 3: Hybrid (library + custom)
```

#### Strategy C: User Experience-Based
```
Candidate 1: Click-based interaction
Candidate 2: Drag-based interaction
Candidate 3: Keyboard-first interaction
Candidate 4: Voice/gesture interaction
```

#### Strategy D: Novelty-first (divergent mode)

Generate 5-8 candidates ranked by departure from repo / domain precedent. Include at least 1 purely-speculative prototype.

```
Candidate 1: Standard known pattern (baseline, low Novelty)
Candidate 2-3: Composed / hybrid patterns not seen in this repo
Candidate 4-5: Cross-domain transfer (e.g., import an interaction pattern from a different product vertical)
Candidate 6-7: Contrarian / adversarial angle (intentionally violate one assumption)
Candidate 8 (optional): Prototype-only — acceptable if Feasibility ≥ 15/25
```

#### Strategy E: Risk-first (review mode)

Generate 3-5 candidates framed as **(risk, mitigation alternative)** pairs against the referenced plan/spec.

```
Risk 1: Failure mode in the plan (unmitigated / partially mitigated / mitigated)
  Alternative 1a: Concrete mitigation with cost estimate
  Alternative 1b: Fallback if 1a is rejected
Risk 2: …
Risk 3: …
```

Minimum 3 risks. Each risk MUST carry at least 1 mitigation alternative; unmitigated-only risks earn 30/30 Risk Exposure (mandatory alternative adoption).

### Step 2: Thought Evaluation

**Purpose**: Score each candidate against objective criteria

**Evaluation Framework**: 5 axes (total 100 points)

#### 1. Implementation Complexity (30 points)
- **30 pts**: Very simple (HTML/CSS only, no library needed)
- **25 pts**: Simple (basic state management, standard patterns)
- **20 pts**: Medium (1-2 external libraries, intermediate state management)
- **15 pts**: Complex (multiple libraries, complex state)
- **10 pts**: Very complex (custom engine, advanced algorithms)

#### 2. Requirements Satisfaction (30 points)
- **30 pts**: Perfect + anticipated needs considered
- **25 pts**: Perfectly satisfied
- **20 pts**: Basic requirements satisfied
- **15 pts**: Partially satisfied (some features missing)
- **10 pts**: Minimally satisfied

#### 3. UX Quality (20 points)
- **20 pts**: Intuitive + efficient + excellent accessibility
- **17 pts**: Intuitive + efficient
- **14 pts**: Intuitive but inefficient
- **11 pts**: Usable but inconvenient
- **8 pts**: Very inconvenient

#### 4. Maintainability (10 points)
- **10 pts**: Simple structure, easy to change
- **8 pts**: Standard patterns, appropriate abstraction
- **6 pts**: Medium complexity
- **4 pts**: Complex structure, hard to change
- **2 pts**: Very complex, risk of becoming legacy

#### 5. Team Capability Fit (10 points)
- **10 pts**: Team is fully proficient
- **8 pts**: Team has experience
- **6 pts**: Learnable (1-2 weeks)
- **4 pts**: Learning required (1 month)
- **2 pts**: Beyond team capability

### Step 3: Selection

**Selection Criteria**:
- **Basic principle**: Select the highest-scoring candidate
- **Tie-breaking priority**:
  1. Requirements satisfaction
  2. Implementation complexity (lower is better)
  3. UX quality
  4. Maintainability
  5. Team capability

**Writing Selection Rationale**:
```markdown
**Selected**: Interpretation B
**Score**: 82/100 (Definitely)
**Rationale**:
- Highest UX and requirements satisfaction scores (28+18=46 pts)
- Team has React DnD library experience (9 pts)
- Implementation complexity within acceptable range (20 pts)
- Maintainability concerns exist but can be mitigated with documentation (7 pts)
```

### Step 4: Lookahead & Backtracking

#### Lookahead
**Purpose**: Predict the next decisions that will arise after selection

**Prediction Items**:
- Next decision: [specific next choice]
- Expected complexity: [Low/Medium/High]
- Risks: [list of anticipated issues]
- Dependencies: [required prerequisite work]

**Example**:
```markdown
**Lookahead**:
- Next decision: Drag library selection (react-dnd vs react-beautiful-dnd)
- Expected complexity: Medium
- Risks:
  * Mobile touch event support issues
  * Performance issues (100+ time slots)
  * Accessibility (keyboard navigation)
- Dependencies: React 18+ required, TypeScript configuration
```

#### Backtrack Plan
**Purpose**: Recovery strategy if the selection fails

**Components**:
- **Alternative**: 2nd-ranked interpretation
- **Trigger conditions**: When to switch
- **Expected loss**: Time/cost loss
- **Recovery time**: Time required to switch to the alternative

**Example**:
```markdown
**Backtrack Plan**:
- Alternative: Interpretation A (simple checkbox, 79 pts)
- Trigger conditions:
  * No progress for 2+ days during implementation
  * Performance target missed (rendering >500ms)
  * Mobile touch issues cannot be resolved
- Expected loss: 2-3 days already invested
- Recovery time: 1 day (checkbox is simple to implement)
```

## Application by Prompt Complexity

### Simple Prompt (< 100 lines)
- Number of candidates: 2-3
- Simplified evaluation: 3 criteria (complexity, satisfaction, UX)
- Lookahead: Optional

### Medium Prompt (100-300 lines)
- Number of candidates: 3-5
- Evaluation: Standard 5 criteria
- Lookahead: Required
- Backtrack: Recommended

### Complex Prompt (300+ lines)
- Number of candidates: 5-7
- Evaluation: 5 criteria + additional criteria (scalability, security, etc.)
- Lookahead: Required (2-step prediction)
- Backtrack: Required (1-2 alternatives)

## Use Cases

### Case 1: UI Component Selection
```markdown
**Problem**: Time slot selection UI implementation

**Candidate Generation**:
- A: Checkbox list
- B: Drag range selection
- C: Calendar view
- D: Start/end input

**Evaluation**: [Score table]

**Selection**: B (82 pts)

**Lookahead**: Library selection, mobile support

**Backtrack**: A (79 pts) - switch if no progress after 2 days
```

### Case 2: State Management Library
```markdown
**Problem**: Global state management selection

**Candidate Generation**:
- A: Redux Toolkit
- B: Zustand
- C: Jotai
- D: Recoil
- E: MobX

**Evaluation**: [Score table]

**Selection**: C (Jotai, 85 pts)

**Lookahead**:
- Predict Redux migration cost (3-5 days)
- Team learning curve (1 week)

**Backtrack**: B (Zustand, 83 pts) - if team has difficulty learning
```

### Case 3: API Design Pattern
```markdown
**Problem**: GraphQL vs REST API

**Candidate Generation**:
- A: REST API
- B: GraphQL
- C: tRPC
- D: gRPC

**Evaluation**: [Score table]

**Selection**: B (GraphQL, 78 pts)

**Lookahead**:
- Schema design complexity
- N+1 query problem handling
- Client type generation

**Backtrack**: A (REST, 75 pts) - if team fails to learn GraphQL
```

## Quality Verification Checklist

### Candidate Generation Quality
- [ ] Are all candidates actually implementable?
- [ ] Do they include various complexity levels?
- [ ] Is each candidate clearly distinct?
- [ ] Are there at least 3 candidates?

### Evaluation Quality
- [ ] Are scores based on objective criteria?
- [ ] Were all candidates evaluated against the same criteria?
- [ ] Is there clear rationale for score differences?
- [ ] Does it reflect the team/project context?

### Selection Quality
- [ ] Is the selection rationale specific (3+ lines)?
- [ ] Was the highest-scoring candidate selected?
- [ ] Are trade-offs explicitly stated?

### Lookahead/Backtrack Quality
- [ ] Is the next decision specific?
- [ ] Are the risks realistic?
- [ ] Are Backtrack conditions measurable?
- [ ] Is the alternative executable?

---

> **Core Principle**: Decision-making based on evaluation criteria, not intuition
> **When to Apply**: When requirements are unclear, when multiple implementation methods exist, when making high-risk decisions
