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
/recursive-requirement-refine /pr 커맨드로 PR을 만들어주는 프롬프트를 개선해줘. ./src/utils/pr-generator.ts 파일을 참고해야 해.
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
> 현재 `/pr` 프롬프트의 어떤 점이 부족한가요? (a) 생성되는 PR 설명이 너무 간략함, (b) 커밋 분류가 부정확함, (c) 특정 포맷/컨벤션을 따르지 않음?

*User: (a)와 (c). 우리 팀 PR 템플릿을 따라야 해.*

**Q2 (Constraints):**
> 팀 PR 템플릿의 필수 섹션은 무엇인가요? (예: Summary, Changes, Test Plan 등)

*User: Summary, Changes (bullet), Breaking Changes, Test Plan*

### Phase 3 — Output

```markdown
---
## Refined Prompt
`/pr` 커맨드로 Pull Request를 생성할 때 다음 규칙을 따르세요.

참조 파일: `./src/utils/pr-generator.ts`

1. git diff와 커밋 히스토리를 분석하여 변경 내용을 파악합니다.
2. 다음 템플릿에 맞춰 PR 본문을 생성합니다:

```
## Summary
(변경의 목적과 배경을 2-3문장으로 설명)

## Changes
- (구체적인 변경사항을 bullet point로 나열)
- (파일명과 함께 주요 변경 설명)

## Breaking Changes
- (하위 호환성을 깨는 변경이 있으면 명시, 없으면 "None")

## Test Plan
- (테스트 방법 또는 검증 계획)
```

3. Summary는 "왜" 변경했는지에 초점. Changes는 "무엇을" 변경했는지에 초점.
4. Breaking Changes가 없으면 섹션을 유지하되 "None"으로 표기.

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
/recursive-requirement-refine API 문서를 만들고 싶어
```

### Phase 2 — Inquiry Loop

**Q1:**
> 어떤 종류의 API 문서인가요? (a) REST API 엔드포인트 레퍼런스, (b) SDK/라이브러리 사용 가이드, (c) 내부 팀용 API 스펙?

*User: Auto*

**→ User signaled early exit. Proceed with reasonable defaults.**

### Phase 3 — Output
*(Generated with explicit assumptions noted in Logic & Strategy section)*
