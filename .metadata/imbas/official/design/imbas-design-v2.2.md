---
created: 2026-03-28
updated: 2026-04-03
tags: [NPDP, imbas, decomposition, pipeline, architecture, plan-issue, verification, codebase-mapping, PL-agenda]
layer: 4
title: imbas 파이프라인 설계 — 기획문서→개발계획서 (v2.2)
expires: 2026-06-30
---
## 개요

기획문서를 입력받아, **검증 → 분할 → 개발 티켓화**하는 체계적 절차.
기존 `/plan-issue` 스킬(단일 Jira 티켓 → PLAN.md)의 상위 진화.

> **이름**: imbas (imbas forosnai — 예언적 통찰)
> **소속**: ogham 하위 Claude Code 플러그인
> **Status**: 설계 v2.2 (2026-04-04)

### 범위 정의

- imbas는 **"이미 준비된 문서를 받아서 검증 → 분할 → 개발 티켓화"** 하는 도구
- 문서 준비(복수 자료 합치기, 정형화)는 **imbas 범위 밖** — 사용자가 외부에서 수행
- 실행 환경: Claude Code 플러그인, LLM 기반 (Haiku/Sonnet/Opus)
- 1회 분할 전제. 연속 분할 필요 시 복수 이슈 입력으로 대응
- 로컬에 참조 가능한 코드베이스 존재 가정

### 스킬 구성

```
[ogham] 사전 가이드 시스템
  └── [imbas] 이슈 분해 플러그인
       ├── validate (Phase 1: 정합성 검증)
       ├── split (Phase 2: Story 분할)
       └── devplan (Phase 3: Subtask/Task 생성)
```

---

## 1. 용어 정의

| 표현 | 의미 | 특성 |
|---|---|---|
| **"LLM을 쓴다"** | AI 언어모델을 활용한 처리 | 비결정론적, 확률적 |
| **"코드를 쓴다"** | 스크립트/코드 기반의 실행 | 결정론적 상태머신 |
| **문제 공간** | 무엇을 만들어야 하는가 (도메인 분해) | spec 티켓 (Story) |
| **해법 공간** | 어떻게 만드는가 (코드 구현) | dev 티켓 (Subtask/Task) |

---

## 2. 핵심 인식: 문제 공간과 해법 공간의 분리

- **재귀 분할**(기획 분해)은 문제 공간 — 코드를 몰라도 됨
- **개발 티켓 생성**은 해법 공간 — 코드베이스와 아키텍처 지식 필수
- 두 공간의 출력은 **1:1 대응이 아니라 N:M 매핑**

---

## 3. 핵심 설계 원칙 (7가지)

1. **원본 불변** — 원본 문서는 읽기 전용
2. **점진적 분할** — 한 번에 뛰어넘지 않음. 한 스텝씩
3. **앵커 체인** — 검증된 상위 티켓만 참조. 원본까지 거슬러 올라가지 않음
4. **탈출은 리포트** — 멈출 때는 "왜 멈췄고 뭐가 필요한지" 구조화
5. **병렬 가능** — 하나가 막혀도 다른 티켓은 계속 진행
6. **결함 노출 구조** — 무결 보장이 아니라, 결함이 숨을 수 없는 구조 설계
7. **LLM이 판단, 코드가 검증** — 둘이 안 맞으면 인간에게 넘김

---

## 4. Jira 3계층 매핑

### 이슈 타입 매핑

| Jira 이슈 타입 | 역할 | 생성 시점 |
|---|---|---|
| **Epic** | 최상위 기획 단위 | Phase 2 입력 규모 판단 시 |
| **Story** | 사용자 가치 단위 (문제 공간) | Phase 2 분할 |
| **Task** | 크로스-Story 공통 기술 작업 | Phase 3 중복 감지 시 추출 |
| **Subtask** | 개발 가능 단위 (해법 공간, EARS) | Phase 3 합류점 |

### 계층 구조

```
Epic
 ├── Story A ──is blocked by──→ Task T1
 │    ├── Subtask A-1 (EARS)
 │    └── Subtask A-2 (EARS)
 ├── Story B ──is blocked by──→ Task T1
 │    └── Subtask B-1 (EARS)
 └── Task T1 (공통 기술 작업)
      ├── Subtask T1-1 (EARS)
      └── Subtask T1-2 (EARS)
```

### Story Description 포맷

혼합(C) 채택:
- User Story 구문: "As a [user], I want [action], so that [benefit]"
- Acceptance Criteria: EARS 패턴 또는 Given/When/Then
- 복잡한 표현 허용
- AC는 **사용자 행동 기반** — 코드 참조 안 함

### Subtask Description 포맷

EARS 형식, md 파싱 가능하게 Description에 기술:
- Spec (EARS 문장)
- Parent (앵커)
- Domain (도메인 태그)
- I/O (입력/출력/조건)
- Acceptance Criteria

### Story 분할 기준

INVEST 표준: Independent, Negotiable, Valuable, Estimable, Small, Testable

### Subtask 종료조건 (4개 모두 충족)

| # | 기준 |
|---|---|
| 1 | **적정 변경 규모** — ~200줄, ~10파일, 1시간 리뷰 |
| 2 | **명세 충분성** — 외부 질문 없이 구현 착수 가능 |
| 3 | **독립성** — 다른 티켓 없이 착수 가능 |
| 4 | **단일 책임** — 하나의 관심사만 |

---

## 5. 전체 흐름

```
[사용자] 기획 문서 준비 (imbas 범위 밖)
    │
    ▼
[Phase 1: validate] ─── 정합성 게이트
  입력: 기획 문서 + 보조정보 (링크/참고자료/주석/리포트)
  동작: 모순/이격/누락/논리적 불능 검증
  출력: 검증 리포트 (md)
  게이트: 이슈 → 블로킹 🧑 / 통과 → Phase 2
    │
    ▼
[Phase 2: split] ─── Story 분할
  입력: 동일 원본 문서 + 보조정보
  동작: INVEST 기반 Story 분할 → Jira Story 생성 (To Do)
  검증: 3→1→2 필터 (근거링크 → 정합성 → 역추론)
    │
    ▼
[크기 검증 게이트] ─── 개발 착수 가능 크기인가?
  ├── YES → 🧑 리뷰 → Phase 3
  └── NO → 수평 분할 → 재검증 (아래 상세)
    │
    ▼
[Phase 3: devplan] ─── Subtask/Task 생성
  입력: 승인된 Story key 목록 + 로컬 코드베이스
  동작:
    Step 1. Story Description → 도메인 키워드 → 코드 진입점 탐색 → 관련 영역 순회
    Step 2. Story별 Subtask 초안 (EARS)
    Step 3. 전체 Subtask 풀 중복 감지 (코드 경로 기반)
    Step 4. Task 후보 추출 + 링크 구성
    Step 5. 매니페스트 생성
  게이트: 🧑 리뷰 → 매니페스트 실행 → Jira 배치 생성
    │
    ▼
[사용자] Ready for Dev 명시적 허가 → 상태 변경
```

---

## 6. Phase 1 상세: 정합성 검증

→ 상세: [[04_Action/npdp/issue-decomposition/validation-workflow-v1.md]]

### 범위

- imbas가 받은 문서의 **정합성/무결성/실현가능성** 검증
- 문서 합치기/정형화는 imbas 범위 밖

### 검증 대상 4종

| 유형 | Phase 1 | 비고 |
|------|---------|------|
| 모순 | ✅ | 양립 불가능한 요구 |
| 이격 | ✅ | 상위-하위 논리 단절 |
| 누락 | ✅ | 논리적으로 있어야 하는 스펙 |
| 논리적 불능 | ✅ | 원리적으로 불가능한 요구 |
| 모호 | ❌ | → Phase 2 1차 분리 시 감지 |
| 코드상 불능 | ❌ | → 별도 단계 (코드 참조 필요) |

### 리포트

- 기본: 마크다운 리포트 (사람이 원본 수정)
- 선택: 요청 시 Jira 이슈 코멘트로 발행 (별도 액션)

---

## 7. Phase 2 상세: Story 분할

### 입출력

- **입력**: Phase 1 통과된 원본 문서 + 보조정보
- **출력**: Jira Story들 (To Do) + 매니페스트

### 검증 파이프라인 (3→1→2 필터)

1회 분할에서도 실행.

```
[3] 근거 링크 명시 (항상, 가벼움)
     ├─ 없음 → 🧑 리뷰 격상
     └─ 있음 ↓
[1] 상위 문맥 정합성 (코드, 저비용)
     ├─ 이탈 → 🧑 리뷰 격상
     └─ 정합 ↓
[2] 역추론 검증 (LLM, 고비용)
     ├─ 불일치 → 🧑 리뷰 격상
     └─ 일치 → ✅ 자율 통과
```

### 크기 검증 + 수평 분할

Phase 2 산출 Story가 개발 착수 가능 크기인지 검증. 논리적 비약 없이 쪼갤 수 있는 단위에는 한계가 있으므로, Subtask로 분해하기엔 아직 클 수 있음.

**크기 검증 기준** (Subtask 종료조건 4개를 Story 수준에서 사전 검증):

| 기준 | Story 수준 판단 |
|---|---|
| 적정 규모 | 예상 Subtask 수가 합리적 범위인가 |
| 명세 충분 | Description만으로 Subtask 분해 가능한가 |
| 독립성 | 다른 Story 없이 Subtask 분해 착수 가능한가 |
| 단일 책임 | 하나의 도메인 관심사만 다루는가 |

**수평 분할 메커니즘**:

```
Story-A (크기 초과)
  → "완료" 처리 (또는 적절한 상태)
  → 더 작은 Story-A1, A2, A3 생성
  → Story-A ──is split into──→ Story-A1, A2, A3
  → Story-A1, A2, A3 ──split from──→ Story-A
  → 신규 Story들에 대해 3→1→2 검증 + 크기 검증 재실행
```

수직 분할(Story→Subtask)이 아닌 수평 분할(Story→더 작은 Story). Jira 3계층을 유지하면서 깊이가 아닌 너비로 확장.

### umbrella Story 패턴

Story가 개념적으로 하위 Story를 필요로 하는 경우 → umbrella Story로 남기고 하위 Story들을 Jira 링크로 연결.

### 탈출 조건

- E2-1: 구체화 필요 → 부족 정보 목록 + 인간 보완 요청
- E2-2: 모순/충돌 → 충돌 지점 명시 + 인간 의사결정 요청
- E2-3: 분할 불필요 → Phase 3 직행
- EC-1: 이해 불가 → 범위 동결 + 질의 구조화
- EC-2: 원본 결함 → 결함 리포트

---

## 8. Phase 3 상세: Subtask 생성 + Task 추출

### 입출력

- **입력**: 승인된 Story key 목록 + 로컬 코드베이스 + (선택) 아키텍처 문서
- **출력**: 매니페스트 → (승인 후) Jira Subtask + Task + 링크

### Phase 3 독립성 원칙

Story Description만으로 독립 동작해야 함. 원본 기획문서 불참조 (앵커 체인 원칙). 필요시 앵커 역추적은 가능하되, 원칙은 독립.

→ Phase 2에서 Story가 충분한 맥락을 담도록 작성되어야 함.

### 코드 참조 방법

- Claude Code의 기본 탐색 능력(Grep/Glob/Read) 활용
- Story의 domain 태그와 I/O 정보를 시드로 코드 진입점 탐색
- 진입점에서 관련 영역 순회 (전체 순회가 아닌 도메인 기반 스코핑)
- 아키텍처 문서: 코드 내 존재 기대. 없으면 코드 순회로 파악. 별도 제공 시 명시적 입력

### Step 1~5

1. **Subtask 초안** — Story Description 기반 코드 탐색 → EARS Subtask 생성
2. **중복 감지** — 전체 Subtask 풀에서 코드 경로 기반 유사도 비교
3. **Task 후보** — 임계값 초과 중복 플래그
4. **Task 생성 판단** — LLM이 병합 여부, 링크 구성 결정
5. **매니페스트 생성** → 🧑 리뷰

### Task 추출 규칙

복수 Story에서 겹치는 Subtask가 다수 발견 → Task 추출 + Story에 `is blocked by` 링크. 기존 합류점의 N:M "병합"을 Jira의 Story/Task 구분으로 자연스럽게 대체.

### B→A 피드백

문제 공간 트리는 건드리지 않음 (트레이서빌리티 보존).
- A 정의는 맞지만 코드 현실과 안 맞는 경우 → dev 티켓에 매핑 근거 명시
- A 분할 자체가 잘못된 경우 → A 티켓에 코멘트 기록

---

## 9. 매니페스트 기반 상태 관리

### Plan-then-Execute 패턴

모든 Phase는 **분석(매니페스트 생성) → 리뷰 → 실행** 구조.

### 매니페스트 구조

```markdown
# imbas Execution Manifest
batch: imbas-20260404-001
epic: PROJ-100

## Tasks (선행 생성)
| id | title | status | jira_key |
|----|-------|--------|----------|
| T1 | OAuth 2.0 인증 모듈 | pending | — |

## Stories
### PROJ-101 "소셜 로그인 가입"
blocked_by: [T1]
#### Subtasks
| id | title (EARS) | status | jira_key |
|----|-------------|--------|----------|
| S101-1 | When new user... | pending | — |
```

### 실행 순서

1. Task 생성 (선행 의존성 없음)
2. Task의 Subtask 생성
3. Story에 블로킹 링크 연결
4. Story의 Subtask 생성

### 실패 복구

매니페스트의 `status` + `jira_key` 필드가 상태 저장소. 중단 후 재실행 시 jira_key 존재하는 항목 스킵.

---

## 10. 워크플로우 상태

| 시점 | 상태 |
|------|------|
| Phase 2 Story 생성 | `To Do` |
| Phase 3 Subtask 생성 | `To Do` |
| Task 생성 | `To Do` |
| 사용자 명시적 허가 후 | `Ready for Dev` |

imbas는 Ready for Dev 상태 변경을 자동으로 하지 않음. 반드시 사용자 허가 필요.

---

## 11. 미결 사항

- [x] ~~이름~~ — imbas
- [x] ~~Jira 계층 매핑~~ — 3계층 + umbrella + blocks + split 링크
- [x] ~~Phase 1 정합성 검증~~ — 4종 검증 + 블로킹
- [x] ~~Story 포맷~~ — User Story + EARS AC 혼합
- [x] ~~Story 분할 기준~~ — INVEST
- [x] ~~크기 검증 + 수평 분할~~ — Story 수준 사전 검증 + 수평 분할 메커니즘
- [x] ~~상태 관리~~ — Plan-then-Execute + 매니페스트
- [x] ~~Phase 3 코드 참조~~ — Claude Code 기본 탐색 + 도메인 시드
- [x] ~~범위 정의~~ — classify 제외, validate/split/devplan
- [ ] **아키텍처 문서 포맷** — POC에서는 코드 내 존재 or 명시 제공으로 충분
- [ ] **Phase 2 검증 파이프라인 세부 튜닝** — POC 결과 기반 조정
- [ ] **코드상 불능 판정** 별도 단계 설계
- [ ] **imbas 플러그인 구현** — 스킬 인터페이스 확정 후 착수

---

## Related
- [[04_Action/npdp/issue-decomposition/discussion-log-20260328.md]]
- [[04_Action/npdp/issue-decomposition/discussion-log-20260404.md]]
- [[04_Action/npdp/issue-decomposition/validation-workflow-v1.md]]
- [[04_Action/npdp/issue-decomposition/spec-ticket-format-v1.md]]
- [[04_Action/npdp/issue-decomposition/merge-point-protocol-v1.md]]
- [[04_Action/npdp/plan-issue-demo-ready-flow.md]]
- [[02_Derived/insights/npdp/vincents-development-soul.md]]