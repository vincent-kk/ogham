---
name: using-maencof
user_invocable: false
description: "[maencof:using-maencof] Meta-skill that governs maencof dialogue discipline: maps 6 cognitive roles to skills, enforces one-question-at-a-time Socratic rules, defines ephemeral/durable/principle vault-write boundaries, and flags common rationalization red flags during session-wide interactions."
argument-hint: ""
version: "1.0.0"
complexity: low
context_layers: []
orchestrator: maencof dialogue governance
plugin: maencof
---

# Using maencof — Dialogue Discipline

**이 규율은 세션 중 반드시 준수합니다.** CLAUDE.md / AGENTS.md 사용자 지시와 충돌하면 사용자 지시가 우선한다.

## 1. Instruction Priority

1. CLAUDE.md / AGENTS.md 사용자 지시
2. maencof 대화 규율 (본 skill)
3. 기본 system prompt

## 2. 6 Role → Skill Mapping

| 역할 | Skill |
|---|---|
| 브레인스토밍 / 아이디에이션 | `maencof-explore --for-brainstorm` → `maencof-think --mode divergent` |
| 인사이트 포획 관리 | `maencof-insight` + `capture_insight` MCP tool |
| 스펙 구체화 | `maencof-refine` (Phase 2.5 Socratic 포함) |
| 인터뷰 수렴 | `maencof-refine` Phase 2.5 |
| 계획 검토 | `maencof-think --mode review` |
| 세션 회고 | SessionEnd hook 자동 recap (명시 호출 없음) |

## 3. Invocation Rule

- Vague input → `maencof-refine` 먼저.
- 다중 해석 → `maencof-think --mode default`.
- Ideation 신호 ("아이디어", "막막", "brainstorm") → `explore --for-brainstorm` → `think --mode divergent`.
- Plan/spec path ref + "검토"/"리뷰" → `think --mode review`.
- 세션 종결 → SessionEnd recap 자동 노출. 저장은 사용자 명시 시에만.
- Auto-insight 는 `capture_insight` + `insight-injector` 가 관찰. 직접 호출 불필요.

## 4. Priority 규칙

1. 모호 → refine 먼저. 대안이 여전하면 think.
2. Think 전 seed 부족 → explore 를 선행.
3. 종결 → SessionEnd recap 경로 (reflect 는 vault judge 전용).
4. 통찰 분류 → `insight.category_filter` (principle 기본 accept, refuted_premise / ephemeral_candidate 기본 reject).

## 5. Red Flags

| 합리화 | 교정 |
|---|---|
| "간단해 skill 불필요" | 단순 task 가 가장 위험 — 규율 적용 |
| "바로 구현부터" | refine 경유, scope 확정 |
| "한번에 다 묻자" | 한 번에 한 질문 (Prime Directive 2) |
| "ToT 후보 저장" | ephemeral — 저장 X (명시 승인만) |
| "'진행' 하니 OK" | Phase 2.5 수렴 조건 확인 |
| "이미 안다" | 재invoke — 기억 대신 관찰 |

## 6. Off-switch

- env `MAENCOF_DISABLE_DIALOGUE=1` → SessionStart emit skip.
- `.maencof-meta/dialogue-config.json::injection.enabled=false` → 동일 skip.
- Off 시 skill 완전 invisible (discovery 손실 수용).

## 7. Vault Write 경계

- E (ephemeral): refine Phase 1/2, think 중간 후보, explore 결과 → 저장 금지.
- D (durable): refine Phase 4, think 선택 해석 (명시 승인), review 리스크.
- P (principle): Phase 2.5 전제, Lookahead 원리 → `capture_insight(category=principle)`.
