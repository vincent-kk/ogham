---
created: 2026-04-03
updated: 2026-04-03
tags: [NPDP, imbas, specification, pipeline, PL-agenda]
layer: 4
title: imbas Pipeline Specification v1.0
expires: 2026-09-30
---
# imbas Pipeline Specification v1.0

## 1. Overview

**imbas**는 기획문서를 입력받아 검증 → 분할 → 개발 티켓화하는 Claude Code 플러그인이다.

```
ogham (사전 가이드 시스템)
  └── imbas (이슈 분해 플러그인)
       ├── validate  — Phase 1: 정합성 검증
       ├── split     — Phase 2: Story 분할
       └── devplan   — Phase 3: Subtask/Task 생성
```

### 1.1 Scope

| 범위 내 | 범위 밖 |
|---------|---------|
| 단일 문서의 정합성/무결성/실현가능성 검증 | 복수 문서 합치기/정형화 |
| INVEST 기반 Story 분할 | 연속 자동 분할 (1회 분할 전제) |
| 코드 참조 기반 Subtask/Task 생성 | 아키텍처 설계 |
| Jira 이슈 생성 + 링크 | Ready for Dev 자동 전환 |

### 1.2 Prerequisites

- Claude Code 환경 (LLM: Haiku/Sonnet/Opus)
- Jira 프로젝트 접근 권한 (MCP: mcp-atlassian)
- 로컬에 참조 가능한 코드베이스
- 사용자가 준비한 기획 문서 (단일 문서)

---

## 2. Design Principles

1. **원본 불변** — 원본 문서는 읽기 전용
2. **점진적 분할** — 논리적 비약 없이 한 스텝씩
3. **앵커 체인** — 검증된 직전 상위만 참조
4. **탈출은 리포트** — 멈출 때는 이유와 필요사항을 구조화
5. **병렬 가능** — 하나가 막혀도 나머지는 진행
6. **결함 노출 구조** — 무결 보장이 아닌, 결함이 숨을 수 없는 구조
7. **LLM이 판단, 코드가 검증** — 불일치 시 인간에게 에스컬레이션

---

## 3. Jira Issue Architecture

### 3.1 Issue Type Mapping

| Jira Level | Type | Role | Created At |
|------------|------|------|------------|
| Level 1 | **Epic** | 최상위 기획 단위 | Phase 2 입력 규모 판단 |
| Level 0 | **Story** | 사용자 가치 단위 (문제 공간) | Phase 2 분할 |
| Level 0 | **Task** | 크로스-Story 공통 기술 작업 | Phase 3 중복 감지 |
| Level -1 | **Subtask** | 개발 가능 최소 단위 (해법 공간) | Phase 3 합류점 |

### 3.2 Hierarchy

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

### 3.3 Link Types

| Link | Purpose | Created At |
|------|---------|------------|
| `is blocked by` / `blocks` | Story ↔ Task 실행 순서 강제 | Phase 3 |
| `is split into` / `split from` | 수평 분할 추적 | Phase 2 크기 검증 |
| umbrella link | 개념적 상위-하위 Story 연결 | Phase 2 분할 |

### 3.4 Workflow States

| Event | State |
|-------|-------|
| imbas가 이슈 생성 | `To Do` |
| 수평 분할된 원본 Story | `Done` (분할 완료) |
| 사용자 명시적 허가 | `Ready for Dev` |

imbas는 `Ready for Dev` 전환을 자동으로 하지 않음. 반드시 사용자 허가 필요.

---

## 4. Story Format

### 4.1 Description Template

```markdown
## User Story

As a [user persona],
I want [action/capability],
so that [benefit/value].

## Acceptance Criteria

<!-- EARS 패턴 또는 Given/When/Then. 복잡한 표현 허용 -->

When [trigger], the [system] shall [action].
While [state], the [system] shall [action].
If [condition], then the [system] shall [action].

## Context

<!-- 선택: 배경 정보, 디자인 참조, 제약사항 -->
```

### 4.2 Characteristics

- 서술 관점: **사용자/비즈니스** (문제 공간)
- AC: **사용자 행동 기반** — 코드 참조 안 함
- 분할 기준: **INVEST** (Independent, Negotiable, Valuable, Estimable, Small, Testable)

---

## 5. Subtask Format

### 5.1 Description Template

```markdown
## Spec

<!-- EARS 패턴 -->
When [trigger], the [system] shall [action].

## Parent

- parent: PROJ-42 "상위 Story 제목"

## Domain

- domain: [도메인명]

## I/O

- input: ...
- output: ...
- precondition: ...
- postcondition: ...

## Acceptance Criteria

- [ ] ...
- [ ] ...
```

### 5.2 Termination Criteria (4개 모두 충족)

| # | Criterion | Metric |
|---|-----------|--------|
| 1 | 적정 변경 규모 | ~200줄, ~10파일, 1시간 리뷰, one self-contained change |
| 2 | 명세 충분성 | 외부 질문 없이 구현 착수 가능 |
| 3 | 독립성 | 다른 티켓 없이 착수 가능, 의존성 있으면 인터페이스 정의됨 |
| 4 | 단일 책임 | 하나의 관심사, 레이어 혼재 없음 |

---

## 6. Pipeline Flow

```
[사용자] 기획 문서 준비 (imbas 범위 밖)
    │
    ▼
[Phase 1: validate] ─── 정합성 게이트
    │
    ▼
[Phase 2: split] ─── Story 분할
    │
    ▼
[크기 검증 게이트] ─── 수평 분할 or Phase 3
    │
    ▼
[Phase 3: devplan] ─── Subtask/Task 생성
    │
    ▼
[사용자] Ready for Dev 허가
```

---

## 7. Phase 1: validate

### 7.1 Input

- 기획 문서 (단일)
- 보조정보 (선택): 링크, 참고자료, 주석, 리포트

### 7.2 Process

정합성/무결성/실현가능성을 검증하는 순수 게이트. 원본을 변형하지 않음.

### 7.3 Validation Types

| Type | Definition | Detection | Example |
|------|-----------|-----------|---------|
| **모순** (Contradiction) | 같은 대상에 양립 불가능한 요구 | 문서 내 교차 비교 | "로그인 없이 접근 가능" vs "인증 필수" |
| **이격** (Divergence) | 상위-하위 간 논리적 단절 | 상위→하위 트레이싱 | 상위 "실시간" → 하위 "배치 처리" |
| **누락** (Omission) | 논리적으로 있어야 하는 스펙 | 입력-출력 체인 검사 | 에러 케이스 미정의 |
| **논리적 불능** (Infeasibility) | 원리적으로 불가능한 요구 | LLM 판단 | "오프라인에서 실시간 동기화" |

### 7.4 Not in Phase 1

| Type | Reason | Handled At |
|------|--------|------------|
| 모호 (Ambiguity) | 1차 분리 과정에서 자연 감지 | Phase 2 |
| 코드상 불능 | 코드 참조 필요, 문제 공간 범위 밖 | 별도 단계 (미설계) |

### 7.5 Output

마크다운 검증 리포트:

```markdown
# imbas Validation Report
source: [문서 식별자]
date: YYYY-MM-DD

## 🔴 모순 (N건)
### V-C01: [제목]
- 위치 A: "..." (섹션 X)
- 위치 B: "..." (섹션 Y)
- 판정: 양립 불가 — [근거]

## 🟠 이격 (N건)
### V-D01: [제목]
- 상위: "..." (섹션 X)
- 하위: "..." (섹션 Y)
- 판정: 논리적 단절 — [근거]

## 🟡 누락 (N건)
### V-M01: [제목]
- 맥락: "..." (섹션 X)
- 기대 스펙: [논리적으로 있어야 할 내용]
- 판정: 미정의 — [근거]

## 🔴 논리적 불능 (N건)
### V-I01: [제목]
- 위치: "..." (섹션 X)
- 판정: 원리적 불가 — [근거]

## ✅ 검증 통과 항목 요약
```

선택: 요청 시 Jira 이슈 코멘트로 발행 (별도 액션).

### 7.6 Gate

- 이슈 발견 → **블로킹**. 사용자가 원본 수정 후 재검증.
- 이슈 없음 → Phase 2 진입.

---

## 8. Phase 2: split

### 8.1 Input

- Phase 1 통과된 원본 문서 + 보조정보
- (동일 원본. Phase 1은 순수 게이트이므로 변형 없음)

### 8.2 Process

INVEST 기반 Story 분할 → Jira Story 생성 (To Do).

#### 8.2.1 Verification Pipeline (3→1→2 Filter)

매 분할에 대해 실행 (1회 분할에서도 적용):

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

자율/리뷰 판단 기준:
- **기준 A**: 분할 결과가 하나의 해석만 가능 → 자율
- **기준 B**: 상위 티켓에 명시된 내용의 재구성 → 자율, 추론 개입 → 리뷰

#### 8.2.2 Size Verification Gate

Phase 2 산출 Story가 개발 착수 가능 크기인지 검증. Subtask 종료조건 4개를 Story 수준에서 사전 적용:

| Criterion | Story-level Check |
|-----------|------------------|
| 적정 규모 | 예상 Subtask 수가 합리적 범위인가 |
| 명세 충분 | Description만으로 Subtask 분해 가능한가 |
| 독립성 | 다른 Story 없이 Subtask 분해 착수 가능한가 |
| 단일 책임 | 하나의 도메인 관심사만 다루는가 |

결과:
- **모두 충족** → 🧑 리뷰 → Phase 3 진입
- **미충족** → 수평 분할

#### 8.2.3 Horizontal Split

Story가 Subtask로 분해하기엔 큰 경우, 수직 분할(계층 하강)이 아닌 수평 분할(동일 레벨 확장)을 수행:

```
Story-A (크기 초과)
  → "Done" 처리 (분할 완료)
  → Story-A1, A2, A3 생성
  → Story-A ──is split into──→ A1, A2, A3
  → A1, A2, A3 ──split from──→ Story-A
  → 신규 Story에 대해 3→1→2 검증 + 크기 검증 재실행
```

Jira 3계층을 유지하면서 깊이가 아닌 너비로 확장.

#### 8.2.4 Umbrella Story Pattern

Story가 개념적으로 하위 Story를 필요로 하는 경우 → umbrella Story로 유지 + 하위 Story를 Jira 링크로 연결.

### 8.3 Escape Conditions

| Code | Condition | Action |
|------|-----------|--------|
| E2-1 | 구체화 필요 | 부족 정보 목록 + 인간 보완 요청 |
| E2-2 | 모순/충돌 | 충돌 지점 명시 + 인간 의사결정 요청 |
| E2-3 | 분할 불필요 | Phase 3 직행 |
| EC-1 | 이해 불가 | 범위 동결 + 질의 구조화 |
| EC-2 | 원본 결함 | 결함 리포트 |

### 8.4 Output

- Jira Story들 (To Do)
- 매니페스트 (Story 목록 + 링크 정보)

### 8.5 Gate

🧑 리뷰 후 분기:
- Story가 아직 크다 → 수평 분할 (Phase 2 재진입)
- Story가 적정 → Phase 3 진입
- Story에 문제 → 블로킹

---

## 9. Phase 3: devplan

### 9.1 Input

- 승인된 Story key 목록 (Jira)
- 로컬 코드베이스
- (선택) 아키텍처 문서 — 코드 내 존재 기대, 없으면 코드 순회, 별도 제공 시 명시

### 9.2 Independence Principle

Phase 3는 **Story Description + 코드만으로 독립 동작**해야 함.
- 원본 기획문서 불참조 (앵커 체인 원칙)
- 필요시 앵커 역추적 가능하되, 원칙은 독립
- Phase 2에서 Story가 충분한 맥락을 담도록 작성되어야 함

### 9.3 Code Reference Method

Claude Code의 기본 탐색 능력(Grep/Glob/Read) 활용:
1. Story의 domain 태그와 I/O 정보에서 도메인 키워드 추출
2. 키워드 기반 코드 진입점 탐색
3. 진입점에서 관련 영역 순회
4. 아키텍처 문서가 있으면 구조 참조, 없으면 코드에서 파악

전체 무차별 순회가 아닌 **도메인 시드 기반 스코핑**.

### 9.4 Process (5 Steps)

```
Step 1. Story Description → 도메인 키워드 → 코드 진입점 → 관련 영역 순회
         → Story별 Subtask 초안 생성 (EARS 형식)

Step 2. 전체 Subtask 풀에서 중복/유사 감지 (코드 경로 기반)

Step 3. 임계값 초과 중복 → Task 후보 플래그

Step 4. LLM이 Task 생성 판단 + 링크 구성

Step 5. 매니페스트 생성
```

### 9.5 Task Extraction Rule

복수 Story에서 겹치는 Subtask가 다수 발견 → Task로 추출:
- Task에 모든 관련 Story를 `blocks` 링크로 유지
- 원본 Story는 삭제하지 않음
- Story는 **실제 작업이 완료된 경우에만** 닫음
  - Task의 관련 Subtask 완료 + Story의 AC 충족 확인 → Story 완료

기존 합류점의 N:M "병합"을 Jira의 Story/Task 구분으로 자연스럽게 대체.

### 9.6 B→A Feedback

문제 공간(Story) 트리는 건드리지 않음 (트레이서빌리티 보존):
- Story 정의는 맞지만 코드 현실과 불일치 → dev 티켓에 매핑 근거 명시
- Story 분할 자체가 잘못된 경우 → Story에 코멘트 기록

### 9.7 Output

실행 매니페스트:

```markdown
# imbas Execution Manifest
batch: imbas-YYYYMMDD-NNN
epic: PROJ-NNN "에픽 제목"

## Tasks (선행 생성)
| id | title | status | jira_key |
|----|-------|--------|----------|
| T1 | [Task 제목] | pending | — |

### T1 Subtasks
| id | title (EARS) | status | jira_key |
|----|-------------|--------|----------|
| T1-ST1 | [EARS 문장] | pending | — |

## Stories

### PROJ-NNN "[Story 제목]"
blocked_by: [T1]

#### Subtasks
| id | title (EARS) | status | jira_key |
|----|-------------|--------|----------|
| S-ST1 | [EARS 문장] | pending | — |
```

### 9.8 Gate

🧑 리뷰 → 승인 → 매니페스트 실행

### 9.9 Execution Order

1. Task 생성 (선행 의존성 없음)
2. Task의 Subtask 생성
3. Story에 `is blocked by` 링크 연결
4. Story의 Subtask 생성

### 9.10 Failure Recovery

매니페스트의 `status` + `jira_key` 필드가 상태 저장소:
- 중단 후 재실행 시 `jira_key` 존재하는 항목 스킵
- `pending` 상태인 항목만 재생성
- 링크 실패 시 링크만 재시도

---

## 10. Manifest-based State Management

### 10.1 Plan-then-Execute Pattern

모든 Phase는 **분석(매니페스트 생성) → 리뷰 → 실행** 구조. Jira에 쓰기 전에 전체 계획을 먼저 생성하고 인간이 검토.

### 10.2 Idempotency

- 각 항목에 `status` (pending/created/failed) + `jira_key` 필드
- `jira_key`가 있으면 Jira에 존재 확인 후 스킵
- 동일 매니페스트 재실행 시 중복 생성 방지

---

## 11. Story-Task Relationship Principle

### 11.1 Core Distinction

| | Story | Task |
|---|---|---|
| **추적 대상** | "작업이 끝났다" (사용자 가치) | "코드가 작성됐다" (기술 작업) |
| **관점** | 문제 공간 (비즈니스) | 해법 공간 (기술) |
| **생성 시점** | Phase 2 | Phase 3 |
| **1:1 매핑** | 아님 | 아님 |

### 11.2 Closure Rule

- Story는 **실제 AC가 충족된 경우에만** 닫음
- Task 완료 ≠ Story 자동 완료
- Task 완료 → 관련 Story의 AC 충족 여부 개별 확인 → Story 완료

### 11.3 Link Preservation

- Task에 흡수된 Story를 삭제하지 않음
- Task ──blocks──→ 모든 관련 Story 링크 유지
- 트레이서빌리티: 어떤 사용자 가치가 어떤 기술 작업에 의해 실현되었는지 추적 가능

---

## 12. Open Items

| Item | Priority | Status |
|------|----------|--------|
| 아키텍처 문서 포맷 | Low | POC에서는 코드 내 존재 or 명시 제공으로 충분 |
| Phase 2 검증 파이프라인 세부 튜닝 | Medium | POC 결과 기반 조정 |
| 코드상 불능 판정 별도 단계 | Low | 별도 설계 예정 |
| 스킬 인터페이스 확정 | High | 요구사항 정리 후 리스트업 |
| imbas 플러그인 구현 | High | 스킬 인터페이스 확정 후 착수 |

---

## Appendix A: Simulation — "소셜 로그인 시스템 구축"

### A.1 Input

기획 문서:
> "우리 서비스에 소셜 로그인(Google, Kakao, Apple)을 추가한다. 기존 이메일 로그인과 병행. 기존 사용자는 소셜 계정을 연동할 수 있어야 하고, 신규 사용자는 소셜로 바로 가입 가능. 관리자는 소셜 로그인 통계를 대시보드에서 확인."

### A.2 Phase 1 Result

| Type | Count | Detail |
|------|-------|--------|
| 이격 | 1 | 통계 범위 미정의 (이메일+소셜 통합 vs 소셜만) |
| 누락 | 1 | 연동 해제(unlink) 시나리오 미정의 |

→ 블로킹 → 사용자 수정 → 재검증 통과

### A.3 Phase 2 Result

초기 분할: S1(소셜 가입), S2(연동), S3(연동 해제), S4(통계)

S1 크기 검증 실패 (3개 provider, 가입+인증 혼재) → 수평 분할:

```
S1 → Done
  ├── S1-a "소셜 가입 플로우 (공통 로직)"
  ├── S1-b "Google OAuth 연동"
  ├── S1-c "Kakao OAuth 연동"
  └── S1-d "Apple OAuth 연동"
```

최종 Story 목록: S1-a, S1-b, S1-c, S1-d, S2, S3, S4

### A.4 Phase 3 Result

코드 탐색: `auth/`, `login/`, `user/` → AuthService, UserRepository 발견

중복 감지: S1-b/c/d + S2 모두 OAuth 플로우 사용 → Task 추출

```
Task T1: "OAuth provider 추상화 레이어 구현"
  ├── T1-ST1: Provider interface 정의
  ├── T1-ST2: Google provider 구현
  ├── T1-ST3: Kakao provider 구현
  └── T1-ST4: Apple provider 구현

T1 ──blocks──→ S1-a, S1-b, S1-c, S1-d, S2, S3
S4 → 블로킹 없음 (독립)
```

### A.5 Final Jira Structure

```
Epic: PROJ-100 "소셜 로그인 시스템 구축"
 ├── Task T1 "OAuth provider 추상화"
 │    ├── Subtask: Provider interface
 │    ├── Subtask: Google impl
 │    ├── Subtask: Kakao impl
 │    └── Subtask: Apple impl
 ├── Story S1-a "소셜 가입 공통" ──blocked by T1
 │    ├── Subtask: OAuth callback 검증
 │    └── Subtask: 신규 계정 생성
 ├── Story S1-b "Google OAuth" ──blocked by T1
 ├── Story S1-c "Kakao OAuth" ──blocked by T1
 ├── Story S1-d "Apple OAuth" ──blocked by T1
 ├── Story S2 "계정 소셜 연동" ──blocked by T1
 │    ├── Subtask: 연동 실행
 │    └── Subtask: 중복 연동 거부
 ├── Story S3 "소셜 연동 해제" ──blocked by T1
 │    ├── Subtask: 해제 검증
 │    └── Subtask: 비밀번호 설정 강제
 └── Story S4 "소셜 로그인 통계"
      └── Subtask: 통계 집계 쿼리
```

---

## Related
- [[04_Action/npdp/issue-decomposition/design-v2.md]]
- [[04_Action/npdp/issue-decomposition/discussion-log-20260404.md]]
- [[04_Action/npdp/issue-decomposition/discussion-log-20260328.md]]
- [[04_Action/npdp/issue-decomposition/validation-workflow-v1.md]]
- [[04_Action/npdp/issue-decomposition/spec-ticket-format-v1.md]]
- [[04_Action/npdp/issue-decomposition/merge-point-protocol-v1.md]]