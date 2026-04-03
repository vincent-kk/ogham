---
created: 2026-04-03
updated: 2026-04-03
tags: [NPDP, decomposition, pipeline, architecture, Jira, craobh, ATO, PL-agenda]
layer: 4
title: ATO 파이프라인 설계 — Jira 3계층 수정 아키텍처 (v3)
expires: 2026-09-30
---
# ATO 파이프라인 설계 — Jira 3계층 수정 아키텍처 (v3)

## 개요

design-v2(무한 깊이 재귀 분할)를 Jira 기본 3계층(Epic → Story/Task → Subtask)에 맞게 재설계한 v3.
2026-04-03~04 세션에서 Vincent의 결정사항을 반영.

> **변경 동기**: 무한 깊이 티켓 아키텍처 → Jira 3단계 계층으로 전환. 이에 따라 재귀 분할, 합류점, N:M 매핑 구조 전면 재설계.

### 선행 문서
- [[04_Action/npdp/issue-decomposition/design-v2.md]] — 원본 설계 (무한 재귀 전제)
- [[04_Action/npdp/issue-decomposition/discussion-log-20260328.md]] — v2 핵심 결정 7건
- [[04_Action/npdp/issue-decomposition/spec-ticket-format-v1.md]] — EARS 포맷 (유지)
- [[04_Action/npdp/issue-decomposition/merge-point-protocol-v1.md]] — 합류점 프로토콜 (대체됨)

---

## 1. 전제 조건

| 항목 | 결정 |
|------|------|
| Jira 계층 | Epic (L1) → Story/Task (L0) → Subtask (L-1), 3단계 고정 |
| 실행 단위 | 1회 실행. 연속 분할은 복수 이슈 입력으로 대체 |
| LLM | Claude Code 플러그인 내 하이쿠/소넷/오푸스 중 택 1 |
| 코드 참조 | 스킬 실행 시점에 로컬에 참조 가능한 코드 존재 가정 |
| 아키텍처 문서 | 코드 내 존재 기대. 없으면 코드 순회로 파악. 별도 제공도 가능 |
| Subtask 포맷 | EARS + 메타데이터 (Description에 md 파싱 가능하게) |
| 정합성 검증 | Phase 1에서 별도 워크플로우로 분리 (목적·형태만 정의, 세부 추후) |

---

## 2. Jira 계층 매핑 전략

### Level 0: Story vs Task 구분 원칙

| 이슈 타입 | 생성 시점 | 목적 |
|-----------|----------|------|
| **Story** | Phase 2 (이슈 분할) | 사용자 관점의 비즈니스 가치 |
| **Task** | Phase 3 (코드 참조 후) | 복수 Story에서 발견된 공통 기술 작업 추출 |

Task는 Phase 2에서 생성되지 않음 — **해법 공간(코드 참조) 이후에만** 도출됨.

### Subtask 종료 조건 (4개, design-v2에서 계승)

| # | 기준 | 판단 |
|---|------|------|
| 1 | **적정 변경 규모** | ~200줄, ~10파일, 1시간 리뷰, one self-contained change |
| 2 | **명세 충분성** | 입력/출력/조건 명확, 외부 질문 없이 구현 착수 가능 |
| 3 | **독립성** | 다른 Subtask 없이 착수 가능, 의존성 있으면 인터페이스 정의됨 |
| 4 | **단일 책임** | 하나의 관심사만, 레이어 혼재 없음 |

---

## 3. 전체 구조

```
[Phase 1: 정형화 + 정합성 검증]
비정형 문서(복수)
  → classify (내부 로직) → 정형 문서
  → 정합성 검증 워크플로우
    - 논리적 흐름 검사
    - 모순/이격 탐지
    - 모호한 부분 식별
    - 누락 스펙 탐지
    - 불능 스펙(절대 불가능한 기능) 탐지
  → 검증 결과 리포트 + 정형 문서

[Phase 2: 이슈 분할]
정형 문서
  → 입력 규모 판단 → Epic 생성 or 기존 Epic에 Story 추가
  → Story 생성 (사용자 가치 단위)
  → Story가 종료조건 미충족 시:
    → umbrella Story 유지 + 하위 Story를 같은 Epic 아래 생성 + 링크
  → 검증 (3→1→2 필터, design-v2에서 계승)

[Phase 3: Subtask 생성 + Task 추출 — 코드 참조 시점]
Story 집합 + 코드베이스 + 아키텍처 문서
  → Step 1: 각 Story별 Subtask 초안 생성 (EARS 형식)
  → Step 2: 전체 Subtask 풀에서 중복/유사 감지 (코드 경로 기반)
  → Step 3: 임계값 초과 중복 → Task 후보 플래그
  → Step 4: LLM이 Task 생성 판단 + 링크 구성
  → Step 5: 인간 리뷰
```

---

## 4. design-v2 개념의 매핑

| design-v2 개념 | v3 (Jira 3계층) |
|---|---|
| 무한 깊이 재귀 분할 | 최대 2단계 + 같은 레벨 수평 재분할 (umbrella Story) |
| 별도 합류점 단계 | Phase 3 = Subtask 생성 시점에 내장 |
| N:M 매핑 — **병합** (M < N) | 공통 기술 작업을 **Task로 추출** |
| N:M 매핑 — **분리** (M > N) | 하나의 Story → 여러 Subtask |
| N:M 매핑 — **미커버 감지** | 아키텍처에 없는 작업 → Task 생성 + 확장 플래그 |
| N:M 매핑 — **우선순위 P1~P4** | Task의 blocks 관계로 실행 순서 자동 결정 |
| 코드 참조 — 경로 실재 확인 | 로컬 코드 직접 참조 |
| 아키텍처 문서 | 코드 내 문서 or 코드 순회 파악 or 명시적 제공 |
| 기획 트리 + 기술 트리 독립 성장 | Phase 2 = 기획 트리, Phase 3 = 기술 영역 (코드 참조) |
| 크로스 피드백 불필요 | 유지 — Story 간 is blocked by 링크로 순서 관리 |
| 검증 파이프라인 (3→1→2) | Phase 2에서 유지 |
| 탈출 조건 10종 | 유지 (Phase 2에 적용) |
| 원칙 7가지 | 유지 |

---

## 5. Story 수평 재분할 전략

Story가 Phase 2 종료조건을 충족하지 못할 때:

```
Epic: PROJ-100 "소셜 로그인"
  ├── Story PROJ-101 "소셜 로그인 가입" (umbrella, 직접 개발 안 함)
  │     ├── relates to → PROJ-103 "Google 로그인 가입"
  │     └── relates to → PROJ-104 "Kakao 로그인 가입"
  ├── Story PROJ-103 "Google 로그인 가입" (개발 대상)
  ├── Story PROJ-104 "Kakao 로그인 가입" (개발 대상)
  └── Story PROJ-102 "기존 계정 소셜 연동" (개발 대상)
```

- umbrella Story는 이력 보존 목적으로 유지 (삭제 안 함)
- umbrella Story의 Status는 하위 Story 완료 시 자동 완료 (Jira Automation 활용 가능)
- 실제 Subtask는 umbrella가 아닌 **하위 Story에만** 생성

---

## 6. Task 추출 패턴

Phase 3에서 복수 Story의 Subtask 간 코드 경로 중복이 감지되면:

```
Story A ──is blocked by──→ Task T1 "OAuth 2.0 인증 모듈 구현"
Story B ──is blocked by──→ Task T1
Story C ──is blocked by──→ Task T2 "social_accounts 테이블 설계"

Task T1 → Subtask: "Google OAuth 연동", "Kakao OAuth 연동"
Task T2 → Subtask: "마이그레이션 스크립트", "인덱스 설계"

Story A → Subtask: T1,T2 제외 나머지 (가입 플로우 UI, 가입 API 등)
```

Task 추출 기준:
- 2개 이상 Story에서 동일 코드 경로/모듈에 대한 Subtask 중복 발생
- LLM이 "독립 기술 작업으로 분리 가능"하다고 판단
- 인간 리뷰에서 승인

---

## 7. 실행 제어: Plan-then-Execute 패턴

### 원칙
분석과 실행을 완전히 분리. Jira에 쓰기 전에 전체 실행 계획(매니페스트)을 생성하고 인간 리뷰를 거침.

### 매니페스트 구조

```markdown
# ATO Execution Manifest
batch: ato-{date}-{seq}
epic: {PROJ-KEY} "{title}"
generated: {timestamp}

## Tasks (선행 생성)
| id | title | status | jira_key |
|----|-------|--------|----------|
| T1 | ... | pending | — |

### T1 Subtasks
| id | title (EARS) | status | jira_key |
|----|-------------|--------|----------|

## Stories
### {PROJ-KEY} "{title}"
blocked_by: [T1, T2]

#### Subtasks
| id | title (EARS) | status | jira_key |
|----|-------------|--------|----------|
```

### 실행 순서

```
Phase 1: Task 생성 (선행 의존성 없음)
Phase 2: Task Subtask 생성
Phase 3: Story ← Task 링크 연결 (is blocked by)
Phase 4: Story Subtask 생성
```

### 실패 복구
- 매니페스트의 `status` 필드로 진행 상태 추적
- `jira_key`가 채워진 항목은 재실행 시 스킵
- 부분 실패 시 동일 매니페스트로 재실행 → 멱등성 보장

---

## 8. v2에서 유지되는 요소

- **정형화(classify)**: 내부 유틸, 사용자에게 투명 (Phase 1)
- **검증 파이프라인 3→1→2**: Phase 2 분할 시 적용
- **탈출 조건 10종 + 공통 2종**: Phase 2에서 유지
- **EARS spec 티켓 포맷**: Subtask Description에 적용
- **원칙 7가지**: 전체 유지 (원본 불변, 점진적 분할, 앵커 체인, 탈출은 리포트, 병렬 가능, 결함 노출 구조, LLM 판단+코드 검증)
- **B→A 피드백**: Story 간 코멘트로 표현 (트레이서빌리티 보존)

---

## 9. 미결 사항

- [ ] Phase 1 정합성 검증 워크플로우의 세부 동작 구체화
- [ ] 매니페스트 포맷 상세 (JSON vs Markdown)
- [ ] umbrella Story 자동 완료를 위한 Jira Automation 룰 구성
- [ ] Phase 3 중복 감지의 임계값 기준
- [ ] craobh 플러그인 구현 (imbas 패키지 내 or 독립 패키지)
- [ ] 실전 테스트 (end-to-end)

---

## Related
- [[04_Action/npdp/issue-decomposition/design-v2.md]]
- [[04_Action/npdp/issue-decomposition/discussion-log-20260328.md]]
- [[04_Action/npdp/issue-decomposition/spec-ticket-format-v1.md]]
- [[04_Action/npdp/issue-decomposition/merge-point-protocol-v1.md]]
- [[04_Action/npdp/plan-issue-demo-ready-flow.md]]
- [[04_Action/npdp/session-summary-20260317.md]]
- [[02_Derived/insights/npdp/vincents-development-soul.md]]