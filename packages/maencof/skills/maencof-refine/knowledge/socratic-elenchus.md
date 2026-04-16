# Socratic Elenchus Layer (Phase 2.5)

Detailed guidance for the Socratic Elenchus layer inserted between Phase 2 exit and Phase 3 entry of `maencof-refine`.

## 1. Overview

Phase 2.5 systematically probes the assumptions that survived Phase 2's inquiry loop. It surfaces implicit premises, tests them with counter-examples, and confirms the adjusted requirement does not contradict Immutable Objects.

**Skip conditions.** If input length < 50 characters AND only Immutable Objects are present, record `socratic.skipped="trivial"` and proceed directly to Phase 3.

**Inheritance.** Prime Directive 2 ("one question at a time") is preserved end-to-end. No new directives are introduced.

## 2. Assumption Surfacing (2.5.a)

Goal: surface the 3 implicit premises that the Phase 2 refined requirement rests on.

Procedure:

1. Name 3 premises concisely. Each premise must be falsifiable in principle.
2. Ask ONE consolidation question: "이 요건은 다음 3개 전제에 기반합니다. 맞습니까?" (followed by the 3 premises).
3. Wait for the user response.

Exit conditions:

- User confirms all 3 → proceed to 2.5.b.
- User corrects at least 1 → integrate correction, proceed to 2.5.b.

Anti-patterns:

- Asking 3 separate questions instead of 1 consolidation. This violates Prime Directive 2.
- Stating premises as tautologies ("the user wants what they asked for"). Premises must carry empirical weight.

## 3. Elenchus Technique (2.5.b)

Goal: present 1-2 boundary counter-examples that expose hidden weaknesses in the premises.

### 3.1 Boundary case

Pick a value at the edge of the accepted parameter space (empty string, zero count, maximum length) and ask whether the requirement still holds.

### 3.2 Null / empty-set case

Replace the subject with an empty collection or absent value. Verify whether the requirement produces meaningful behavior.

### 3.3 Scale-inversion case

Invert the expected scale (10x larger, 10x smaller, adversarial input). Test whether assumptions survive.

Counter-example handling:

- Accepted → back-edge to Phase 2 (see section 4).
- Rejected → proceed to 2.5.c.

## 4. Back-edge Rules

Rules for the 2.5.b → Phase 2 transition when a counter-example is accepted:

1. **Variable preservation.** Goal, Context, Constraints, Immutable Objects, and prior answers persist. Do NOT start a new Phase 2 session.
2. **Re-query limit.** Only variables changed by the accepted counter-example may be re-queried. Reusing answered questions is forbidden (inherits Phase 2 guideline: "Never repeat a question already answered").
3. **Total question cap.** Phase 2.5 contributes at most 3 questions (1 consolidation + up to 2 counter-examples). Combined with Phase 2 (2-5 target), total session cap is **5-8 turns**. On cap hit, apply convergence criterion 3 ("unchanged requirement across loops") as early exit.
4. **Back-edge count cap.** Phase 2.5.b → Phase 2 back-edge is allowed **once**. A second accepted counter-example forces skip to 2.5.c (contradiction check only) then Phase 3. This prevents infinite loops.

## 5. Contradiction Check (2.5.c)

Goal: verify the adjusted requirement does not contradict Immutable Objects or declared Constraints.

Procedure:

1. List Immutable Objects from Phase 1 and all user-declared Constraints.
2. For each, check whether the Phase 2.5-adjusted requirement remains consistent.
3. If any contradiction is found, surface it to the user and ask a targeted resolution question (counts against the 5-8 total cap).

Exit: no contradictions → advance to Phase 3.

## 6. Convergence Criteria

Phase 2.5 as a whole converges when ANY of the following hold:

1. 3+ premise iterations with zero new contradictions or counter-examples.
2. Explicit user termination ("enough", "auto", "just do it").
3. Previous loop's revision matches the current revision.
4. Total question cap (5-8 turns) reached.
5. Back-edge count cap (>1) exceeded.

## 7. Non-convergence Escape

If all convergence criteria fail AND the 5-8 turn cap is exceeded, emit a warning in the Logic & Strategy section and proceed to Phase 3 with the best-effort requirement. Do NOT block the user.

## 8. Worked Example: "메모 검색 기능 추가"

Phase 2 exit state:

- Goal: 메모 앱에 검색 기능 추가.
- Context: 기존 iOS 네이티브 앱.
- Constraints: SQLite FTS5 사용.

Phase 2.5.a surfaces 3 premises:

1. 검색 대상은 텍스트 본문뿐이다.
2. 정렬 기준은 최신순이다.
3. 대소문자 구분하지 않는다.

Consolidation question: "이 요건은 위 3개 전제에 기반합니다. 맞습니까?" User corrects premise 1: "첨부 이미지의 OCR 텍스트도 검색 대상이다."

Phase 2.5.b: scale-inversion counter-example: "10만 개의 이미지가 첨부된 계정에서 검색 응답 시간 상한은?" User accepts: "300ms." Back-edge once to Phase 2 to integrate response time budget into Constraints.

Phase 2.5.c: check against Immutable Objects (FTS5). No contradiction. Advance to Phase 3.

Total turns used: Phase 2 (3) + Phase 2.5 (2 + 1 back-edge refresh) = 6. Within cap.
