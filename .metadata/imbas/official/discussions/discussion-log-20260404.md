---
created: 2026-04-03
updated: 2026-04-03
tags: [NPDP, imbas, decomposition, discussion-log, PL-agenda]
layer: 4
title: imbas 파이프라인 논의 기록 — 2026-04-04 핵심 결정
expires: 2026-09-30
---
## 개요

2026-04-04 세션. design-v2를 v2.2로 발전. 이름 변경, Jira 3계층 매핑, 범위 재정의, 정합성 검증, Jira 표준 정합, 수평 분할, 입출력 계약, Story-Task 관계를 확정.

---

## 결정 1: 이름 변경 — craobh → imbas

- 기존: ATO (파이프라인) + craobh (플러그인)
- 변경: **imbas** (파이프라인 + 플러그인 통합)
- ogham 하위 Claude Code 플러그인

---

## 결정 2: Jira 3계층 매핑

- Epic → Story/Task → Subtask
- Story: 사용자 가치 단위 (umbrella 패턴)
- Task: 크로스-Story 공통 기술 작업 (Phase 3 추출)
- Subtask: EARS 형식 dev 단위
- EARS spec, domain, I/O, AC는 Description에 md 파싱 가능하게 기술

---

## 결정 3: Task 추출 패턴

복수 Story에서 겹치는 Subtask → Task 생성 + `is blocked by` 링크. 기존 합류점 N:M "병합"을 Jira의 Story/Task 구분으로 대체.

---

## 결정 4: Plan-then-Execute + 매니페스트

매니페스트 생성 → 인간 리뷰 → 배치 실행. status + jira_key로 멱등성 + 실패 복구.

---

## 결정 5: Phase 1 정합성 검증

1. 리포트 형태: 마크다운 리포트. Jira 코멘트는 별도 액션
2. 검증 범위: 모순/이격/누락/논리적 불능 (4종)
3. 블로킹: 이슈 발견 시 Phase 2 진입 블로킹

---

## 결정 6: 실행 환경 전제

- Claude Code 플러그인, LLM (Haiku/Sonnet/Opus)
- 1회 분할 전제
- 로컬 코드 존재 가정
- 아키텍처 문서: 코드 내 or 명시 제공

---

## 결정 7: Jira 표준 정합

- Story 분할 기준: INVEST 표준
- Story 서술: 사용자 관점
- Story Description: (C) 혼합 — User Story + EARS AC, 장황한 표현 허용
- Story AC: 사용자 행동 기반, 코드 참조 안 함

---

## 결정 8: 워크플로우 상태 및 게이트

- 초기 상태: To Do (Story, Subtask, Task 모두)
- Story 검증 게이트: 추가 분할 / Phase 3 진입 / 블로킹
- Ready for Dev: 사용자 명시적 허가 후에만

---

## 결정 9: 범위 재정의

- **imbas 범위 밖**: 문서 합치기/정형화 (classify 제거)
- **imbas 범위**: validate(검증) → split(분할) → devplan(티켓화)

---

## 결정 10: 입출력 계약

- Phase 1→2: 동일 원본 문서 + 보조정보 (링크/참고자료/주석/리포트)
- Phase 2→3: Story Description + 코드만으로 독립 동작 (앵커 체인 원칙)
- Phase 3 코드 참조: Claude Code 기본 탐색 + 도메인 키워드 기반 진입점

---

## 결정 11: 검증 파이프라인 + 크기 검증 + 수평 분할

- 3→1→2 필터: 1회 분할에서도 실행
- 크기 검증: Subtask 종료조건 4개로 Story 수준 사전 검증
- 수평 분할: 원본 Story → 완료 처리 + 작은 Story N개 생성 + `is split into`/`split from` 링크

---

## 결정 12: Story-Task 관계 원칙

### 핵심 원칙
- **Story는 "작업이 끝났다"를 추적** — 사용자 가치 관점의 완료
- **Task는 "코드가 작성됐다"를 추적** — 기술 작업 관점의 완료
- 둘은 1:1 매핑이 아님

### Task에 흡수된 Story의 처리
- Task 생성 시 원본 Story를 **삭제하지 않음**
- Task에 모든 관련 Story를 `blocks` 링크로 유지
- Story는 **실제 작업이 완료된 경우에만** 닫음
  - Task의 관련 Subtask 완료 + Story의 AC 충족 확인 → Story 완료 처리
- 예: Task T1 완료 → S1-b의 "Google 로그인 성공" AC 충족 확인 → S1-b 완료

### 시뮬레이션에서 발견된 패턴
수평 분할된 S1-b/c/d(provider별 Story)가 Task T1(OAuth 추상화)에 의해 코드 레벨에서 처리되는 경우:
- S1-b/c/d는 Jira에 Story로 존속
- T1 ──blocks──→ S1-b, S1-c, S1-d
- T1 Subtask 완료 → S1-b/c/d 각각의 AC 충족 여부 개별 확인 → 개별 완료 처리

---

## Related
- [[04_Action/npdp/issue-decomposition/design-v2.md]]
- [[04_Action/npdp/issue-decomposition/validation-workflow-v1.md]]
- [[04_Action/npdp/issue-decomposition/discussion-log-20260328.md]]