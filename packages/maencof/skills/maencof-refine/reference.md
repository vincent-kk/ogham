# Reference: Process Algorithm & Policies

Detailed specification for the Recursive Requirement Refine skill.

## Phase 1: Input Analysis

Analyze the user's input to extract four dimensions:

| Dimension | Description | Examples |
|-----------|-------------|----------|
| **Goal** | Desired outcome or deliverable | "Generate a PR description", "Write an API spec" |
| **Context** | Audience, environment, domain | "For senior engineers", "Production Node.js app" |
| **Constraints** | Format, length, style, tech stack | "Markdown format", "Under 500 words", "TypeScript" |
| **Immutable Objects** | Tokens that must be preserved exactly | `/pr`, `./src/main.ts`, `https://...` |

After analysis, assess completeness:
- If all four dimensions are sufficiently defined → skip to Phase 3
- If any critical gaps exist → enter Phase 2

## Phase 2: The Inquiry Loop

This is the iterative core of the skill. Repeat until exit condition is met.

### Loop Steps

1. **Identify** the single most important missing variable from Phase 1 dimensions.
2. **Prioritize** by impact: Goal > Context > Constraints > Style preferences.
3. **Formulate** a concise, specific question targeting that one variable.
4. **Present** the question and **STOP**. Wait for user response.
5. **Integrate** the answer into the requirement model.
6. **Re-evaluate** completeness. If gaps remain, return to step 1.

### Exit Conditions

Proceed to Phase 3 when ANY of these are true:
- **Completeness:** Goal, Format, and Constraints are all clearly defined.
- **User signal:** User says "Enough", "Auto", "Just do it", or equivalent.
- **Diminishing returns:** Remaining ambiguities are minor and can be resolved with reasonable defaults.

### Question Design Guidelines

- Ask only ONE question per turn.
- Provide 2-3 concrete options when possible to reduce user cognitive load.
- Frame questions around decisions, not open-ended exploration.
- Never repeat a question already answered.

## Phase 2.5: Socratic Elenchus Layer

Inserted between Phase 2 exit and Phase 3 entry. Skipped when input < 50 chars AND only Immutable Objects are present (`socratic.skipped="trivial"`).

### 2.5.a Assumption Surfacing

Name 3 implicit premises that the refined requirement rests on. Ask ONE consolidation question: "이 요건은 다음 3개 전제에 기반합니다. 맞습니까?" Exit when all 3 are confirmed OR at least 1 is corrected.

### 2.5.b Elenchus (Counter-example probing)

Present 1-2 boundary counter-examples against the confirmed premises. See [knowledge/socratic-elenchus.md](knowledge/socratic-elenchus.md) for boundary / null-empty / scale-inversion techniques.

- Counter-example accepted → back-edge to Phase 2 (see Back-edge Rules below).
- Counter-example rejected → continue to 2.5.c.

### 2.5.c Contradiction Check

Verify the adjusted requirement does not contradict Immutable Objects or declared Constraints. Proceed to Phase 3 when no contradictions remain.

### Back-edge Rules (2.5.b → Phase 2)

1. **Variable preservation.** Goal, Context, Constraints, Immutable Objects, and prior answers persist. The back-edge is NOT a Phase 2 restart.
2. **Re-query limit.** Only variables changed by the accepted counter-example may be re-queried. Reusing answered questions is forbidden (see Phase 2: "Never repeat a question already answered").
3. **Total question cap.** Phase 2.5 may add at most **3 questions** (1 consolidation in 2.5.a + up to 2 in 2.5.b). Combined with Phase 2's 2-5 target, total session cap is **5-8 turns**. On cap hit, apply convergence criterion 3 ("unchanged requirement across loops") as early exit.
4. **Back-edge count cap.** Phase 2.5.b → Phase 2 back-edge is allowed **once**. A 2nd accepted counter-example forces skip to 2.5.c (contradiction check only) then Phase 3. Prevents infinite loops.

### Convergence Criteria (Phase 2.5 whole)

1. 3+ premise iterations with zero new contradictions/counter-examples.
2. Explicit user termination.
3. Previous loop's revision matches current revision.
4. Total question cap (5-8 turns) reached.
5. Back-edge count cap (>1) exceeded.

Satisfying ANY criterion advances to Phase 3.

## Phase 3: Final Generation

Construct the optimized prompt incorporating all gathered requirements.

### Generation Rules

1. **Structure:** Organize the prompt logically (context → task → constraints → output format).
2. **Specificity:** Replace vague language with precise instructions.
3. **Immutable preservation:** All technical tokens appear exactly as provided (see [knowledge/immutable-objects.md](knowledge/immutable-objects.md)).
4. **Self-contained:** The generated prompt should work independently without this conversation context.

### Output Structure

```markdown
---
## Refined Prompt
(The fully optimized, precise prompt text)

## Logic & Strategy
(Brief explanation of:
 - Why specific structural choices were made
 - How constraints were applied
 - What defaults were assumed for unresolved minor ambiguities)
---
```

## Document Source Auto-Update Policy

When the initial requirement was provided as a **file or document** (file path, IDE buffer, or any text file reference — not direct chat input):

1. **Detect source type:** During Phase 1, record whether the input originated from a document.
2. **Auto-update on completion:** After Phase 3 final generation, **immediately write** the refined prompt content back to the source document.
3. **No confirmation needed:** Do NOT ask the user whether to update the file. Just update it.
4. **Scope:** Replace the document content with the refined prompt. If the document contains other content beyond the original requirement, update only the relevant section.
5. **Fallback:** If the input was direct text (typed in chat), display the output in the normal `## Refined Prompt` / `## Logic & Strategy` format.
6. **Stop here:** After the file is updated, the skill is complete. Do not proceed to implement the prompt.

## Interview Conduct Policy

| Rule | Description |
|------|-------------|
| **Language** | Conduct the interview in the user's language. Final prompt language should match user intent. |
| **Tone** | Professional, analytical, cooperative. Avoid filler or pleasantries. |
| **Efficiency** | Minimize total question count. Target 2-5 questions for most inputs. |
| **Transparency** | When making assumptions, state them explicitly in Logic & Strategy. |
