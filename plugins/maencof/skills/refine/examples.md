# Examples: Recursive Requirement Refine

## Example 1: Vague Feature Request

### User Input
```
/recursive-requirement-refine Make a good README for my project
```

### Phase 1 — Analysis
| Dimension | Status |
|-----------|--------|
| Goal | README generation — defined but underspecified |
| Context | Unknown project type, audience, tech stack |
| Constraints | No format/length/style specified |
| Immutable Objects | None detected |

### Phase 2 — Inquiry Loop

**Q1 (Goal specificity):**
> This README is for: (a) an open-source library seeking contributors, (b) an internal tool for team onboarding, or (c) a portfolio project showcasing your work?

*User: (a) open-source library*

**Q2 (Context):**
> What does the library do in one sentence? And what language/framework is it built with?

*User: It's a TypeScript utility for parsing CLI arguments. Built with Node.js.*

**Q3 (Constraints):**
> Should the README include: (a) just usage basics (install + quick start), (b) full API reference, or (c) usage basics + contributing guide?

*User: (c)*

### Phase 3 — Output

```markdown
---
## Refined Prompt
Write a README.md for an open-source TypeScript CLI argument parser library (Node.js).

Target audience: developers evaluating or contributing to the library.

Include these sections in order:
1. Project name + one-line description
2. Features (bullet list, 3-5 key features)
3. Installation (`npm install`)
4. Quick Start (minimal working example with code block)
5. API Overview (main functions with brief signatures)
6. Contributing Guide (setup, PR process, code style)
7. License

Style: concise, scannable, developer-friendly. Use code blocks for all examples. Keep total length under 300 lines.

## Logic & Strategy
- Structured for open-source discoverability: quick evaluation (sections 1-4) before deeper engagement (5-7).
- Contributing guide included per user request to encourage community participation.
- API Overview kept brief; a full API reference can live in separate docs.
---
```

---

## Example 2: Input with Immutable Objects

### User Input
```
/recursive-requirement-refine Improve the prompt that generates PRs via the /pr command. It must reference the ./src/utils/pr-generator.ts file.
```

### Phase 1 — Analysis
| Dimension | Status |
|-----------|--------|
| Goal | Improve a prompt that generates PRs via `/pr` command |
| Context | Partially defined — references a specific file |
| Constraints | Not specified |
| Immutable Objects | `/pr`, `./src/utils/pr-generator.ts` |

### Phase 2 — Inquiry Loop

**Q1 (Goal specificity):**
> What is lacking in the current `/pr` prompt? (a) generated PR descriptions are too brief, (b) commit categorization is inaccurate, (c) it doesn't follow a specific format/convention?

*User: (a) and (c). It must follow our team's PR template.*

**Q2 (Constraints):**
> What are the required sections of your team's PR template? (e.g., Summary, Changes, Test Plan, etc.)

*User: Summary, Changes (bullet), Breaking Changes, Test Plan*

### Phase 3 — Output

```markdown
---
## Refined Prompt
When generating a Pull Request via the `/pr` command, follow these rules.

Reference file: `./src/utils/pr-generator.ts`

1. Analyze the git diff and commit history to identify the changes.
2. Generate the PR body using the following template:

```
## Summary
(Describe the purpose and background of the change in 2-3 sentences)

## Changes
- (List concrete changes as bullet points)
- (Describe major changes together with the file name)

## Breaking Changes
- (Specify any backward-incompatible changes; write "None" if there are none)

## Test Plan
- (Test method or verification plan)
```

3. Summary focuses on "why" the change was made. Changes focus on "what" was changed.
4. If there are no Breaking Changes, keep the section but mark it as "None".

## Logic & Strategy
- Immutable objects `/pr` and `./src/utils/pr-generator.ts` preserved exactly as provided.
- Template structure matches team convention (Summary → Changes → Breaking Changes → Test Plan).
- Separated "why" (Summary) from "what" (Changes) for clearer PR communication.
---
```

---

## Example 3: Fast Exit (Well-Defined Input)

### User Input
```
/recursive-requirement-refine Write a TypeScript function that validates email addresses using regex. Return boolean. No external deps. Add JSDoc.
```

### Phase 1 — Analysis
| Dimension | Status |
|-----------|--------|
| Goal | Email validation function — clearly defined |
| Context | TypeScript, no dependencies |
| Constraints | Regex-based, boolean return, JSDoc required |
| Immutable Objects | None |

**All dimensions sufficiently defined → Skip Phase 2, proceed to Phase 3.**

### Phase 3 — Output

```markdown
---
## Refined Prompt
Write a TypeScript function with the following specification:

- **Function name:** `isValidEmail`
- **Parameter:** `email: string`
- **Return type:** `boolean`
- **Implementation:** Use a single regex pattern (no external libraries).
- **Documentation:** Include a JSDoc comment with `@param`, `@returns`, and `@example`.
- **Edge cases to handle:** empty string, missing `@`, missing domain, consecutive dots, leading/trailing spaces.

Export the function as a named export.

## Logic & Strategy
- Function name derived from standard naming convention for boolean-returning validators (`is` prefix).
- Edge cases added to ensure practical robustness beyond basic regex matching.
- Named export chosen as the default TypeScript module pattern.
---
```

---

## Example 4: User Exits Early

### User Input
```
/recursive-requirement-refine I want to create API documentation
```

### Phase 2 — Inquiry Loop

**Q1:**
> What kind of API documentation? (a) REST API endpoint reference, (b) SDK/library usage guide, (c) internal team API spec?

*User: Auto*

**→ User signaled early exit. Proceed with reasonable defaults.**

### Phase 3 — Output
*(Generated with explicit assumptions noted in Logic & Strategy section)*
