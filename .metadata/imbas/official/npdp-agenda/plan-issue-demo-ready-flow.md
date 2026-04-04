---
created: 2026-03-19
updated: 2026-03-19
tags: [NPDP, aerodrome, decomposition, plan-issue, demo-ready, PL-agenda]
layer: 4
title: NPDP Phase 2 실행 — plan-issue 스킬 및 Demo-Ready 분해 플로우
expires: 2026-04-20
---
# NPDP Phase 2 실행 — plan-issue 스킬 및 Demo-Ready 분해 플로우

## 배경

NPDP Phase 2 (기획서→설계도)의 핵심 과제인 "기획서→단위기능 분해 Flow"를 구체화하는 첫 실행.
KAN-10 (타이머 Start/Stop) 티켓을 대상으로 수동 분해를 수행하며 `/plan-issue` 스킬을 구축했다.

## 구축된 도구

### `/plan-issue` 스킬 (`~/.claude/skills/plan-issue/`)

Jira 티켓을 읽고, 코드베이스를 스캔한 뒤, 실행 가능한 PLAN.md를 생성하는 PM 스킬.

**6-Phase 워크플로우**:
1. Jira 티켓 패치 (AC 추출)
2. 코드베이스 스캔 (기존 자산 목록화)
3. 아키텍처 결정
4. Step 분해 (Demo-Ready 원칙 적용)
5. 의존성 그래프 + 실행 전략
6. feature 브랜치 + PLAN.md 생성

**파일 구성**:
- `SKILL.md` — 워크플로우, 트리거, 6가지 핵심 원칙
- `reference.md` — PLAN.md 템플릿, Step 구조 규칙, 앵커 주석 포맷, 품질 체크리스트
- `knowledge/demo-ready.md` — Demo-at-Every-Step 원칙 상세
- `knowledge/codebase-scan.md` — Atomic Design 프로젝트 탐색 가이드

## 핵심 원칙 2가지 (신규 확립)

### 1. Demo-at-Every-Step
- 모든 Step은 완료 시 Storybook 또는 dev 페이지에서 시연 가능해야 한다
- 순수 로직(store, hook, util)은 임시 Storybook story(`Dev/` 경로)를 생성하여 시각화
- "보이지 않는 Step"은 존재하지 않는다

### 2. Anchor Comments for Temp Code
- 포맷: `// @temp:ISSUE-KEY:step-N — {설명}, remove after Step M`
- `grep -r "@temp:KAN-10" src/` 로 티켓별 임시 코드 전수 검색 가능
- 각 앵커는 제거 시점(어느 Step에서 cleanup)을 명시
- PLAN.md에 Temp Code Lifecycle 테이블로 전체 추적

## KAN-10 적용 결과

| Step | 내용 | Demo 방식 | Temp Code |
|------|------|-----------|-----------|
| 1 | useTimerStore | Storybook `Dev/TimerStore` | `@temp:KAN-10:step-1` → Step 3 제거 |
| 2 | useTimerTick | Storybook `Dev/TimerTick` | `@temp:KAN-10:step-2` → Step 3 제거 |
| 3 | TimerPage | Storybook `Pages/TimerPage` | cleanup: step-1,2 제거 |
| 4 | App.tsx 연결 | Dev server localhost:5173 | 없음 |
| 5 | Supabase 설정 | Storybook `Dev/SupabaseClient` | `@temp:KAN-10:step-5` → Step 6 제거 |
| 6 | Supabase 저장 | Dev server + Dashboard | cleanup: step-5 제거 |

실행 전략: Phase A (Step 1+5 병렬) → Phase B (Step 2→3→4 순차) → Phase C (Step 6 통합)

## NPDP 통제 게이트와의 관계

이 플로우에서 **인간 통제 게이트**는:
1. **PLAN.md 리뷰** — AI가 분해한 결과를 인간이 검토/승인 (Phase 2 게이트)
2. **각 Step 데모 확인** — Step 완료 시 Storybook/dev에서 인간이 시연 확인 (Phase 3-4 게이트)
3. **Temp code cleanup 확인** — 최종 Step 후 `grep @temp` 결과가 비어있는지 확인

→ [[04_Action/npdp/agenda-01-decomposition-flow.md]]의 "통제 게이트 포인트 정의" 질문에 대한 첫 번째 구체적 답변.

## Related
- [[03_External/topical/aac-npdp-framework.md]]
- [[04_Action/npdp/agenda-01-decomposition-flow.md]]
- [[03_External/topical/aac-tmtr-time-tracker.md]]