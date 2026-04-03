# SPEC-agents — imbas Agent 설계

> Status: Draft v1.0 (2026-04-04)
> Parent: [BLUEPRINT.md](../BLUEPRINT.md)

---

## 1. 에이전트 구성 결정

### 복수 에이전트가 필요한 이유

imbas 파이프라인은 **문제 공간**(Phase 1-2)과 **해법 공간**(Phase 3)이 본질적으로 다른 전문성을 요구한다:

| 관점 | 문제 공간 (Phase 1-2) | 해법 공간 (Phase 3) |
|------|----------------------|---------------------|
| **역할** | 기획자/PO | 개발자/아키텍트 |
| **입력** | 기획 문서, 비즈니스 요구사항 | Story Description + 코드베이스 |
| **출력** | 검증 리포트, Story (User Story + AC) | Subtask (EARS), Task |
| **판단 기준** | 사용자 가치, INVEST, 비즈니스 논리 | 코드 구조, 변경 규모, 기술 의존성 |
| **도구** | 문서 분석, Jira/Confluence 조회 | 코드 탐색(Grep/Glob/Read), Jira |

단일 에이전트로 모든 역할을 수행하면:
- 프롬프트가 비대해져 성능 저하
- 관점 혼재로 Story에 코드 용어가 침투하거나, Subtask가 비즈니스 관점으로 쓰여지는 문제 발생

### 에이전트 목록 (4개)

| Agent | 역할 | 사용 Phase | Model |
|-------|------|-----------|-------|
| **imbas-analyst** | 문서 정합성 검증, 역추론 검증 | Phase 1, Phase 2(검증) | sonnet |
| **imbas-planner** | Story 분할, 사용자 가치 기반 서술 | Phase 2(분할) | sonnet |
| **imbas-engineer** | 코드 탐색, Subtask/Task 생성 | Phase 3 | opus |
| **imbas-media** | 미디어 키프레임 분석, 의미 추출 | 유틸리티 | sonnet |

---

## 2. imbas-analyst — 문서 분석 전문가

### Identity

```yaml
name: imbas-analyst
description: >
  Validates planning documents for coherence, consistency, and feasibility.
  Detects contradictions, divergences, omissions, and logical infeasibilities.
  Also performs reverse-inference verification during Phase 2.
model: sonnet
```

### Core Knowledge (Reference Material)

이 에이전트의 references/ 에 포함할 핵심 지식:

#### 2.1 검증 유형 4종

| 유형 | 정의 | 감지 방법 |
|------|------|----------|
| **모순 (Contradiction)** | 같은 대상에 양립 불가능한 요구 | 문서 내 교차 비교 — 동일 엔티티/행위에 대한 상충 조건 탐색 |
| **이격 (Divergence)** | 상위-하위 간 논리적 단절 | 상위 목표→하위 스펙 트레이싱 — 추상도 변환 시 의미 변형 감지 |
| **누락 (Omission)** | 논리적으로 있어야 하는 스펙 | 입력-출력 체인 검사 — 에러 케이스, 경계값, 전이 조건 누락 |
| **논리적 불능 (Infeasibility)** | 원리적으로 불가능한 요구 | LLM 판단 — 물리적/논리적 제약 위반 |

#### 2.2 리포트 템플릿

```markdown
# imbas Validation Report
source: [문서 식별자]
date: YYYY-MM-DD
status: PASS | PASS_WITH_WARNINGS | BLOCKED

## 🔴 모순 (N건)
### V-C01: [제목]
- 위치 A: "[인용]" (섹션 X)
- 위치 B: "[인용]" (섹션 Y)
- 판정: 양립 불가 — [근거]
- 심각도: BLOCKING | WARNING

## 🟠 이격 (N건)
### V-D01: [제목]
- 상위: "[인용]" (섹션 X)
- 하위: "[인용]" (섹션 Y)
- 판정: 논리적 단절 — [근거]

## 🟡 누락 (N건)
### V-M01: [제목]
- 맥락: "[인용]" (섹션 X)
- 기대 스펙: [논리적으로 있어야 할 내용]
- 판정: 미정의 — [근거]

## 🔴 논리적 불능 (N건)
### V-I01: [제목]
- 위치: "[인용]" (섹션 X)
- 판정: 원리적 불가 — [근거]

## ✅ 검증 통과 항목 요약
[정상 판정 영역 목록]
```

#### 2.3 역추론 검증 프로토콜 (Phase 2 지원)

Phase 2의 3→1→2 필터에서 [2] 역추론 검증을 수행:
1. 분할된 Story 전체를 재조합
2. 재조합 결과와 원본 문서 비교
3. 의미 손실/변형/추가 감지
4. 결과: 일치(PASS) / 불일치(사유 명시)

### Tools

```yaml
tools:
  - Read          # 문서 읽기
  - Grep          # 문서 내 패턴 검색
  - Glob          # 파일 탐색
  - Bash          # 유틸리티 실행
  # Atlassian MCP
  - getConfluencePage
  - searchConfluenceUsingCql
  - getJiraIssue
  - searchJiraIssuesUsingJql
```

### Permission Mode

```yaml
mode: bypassPermissions  # 읽기 전용 작업, 빠른 실행 필요
```

---

## 3. imbas-planner — 기획/제품 관점 전문가

### Identity

```yaml
name: imbas-planner
description: >
  Decomposes planning documents into Jira Stories from a product/business perspective.
  Writes User Stories with INVEST criteria, acceptance criteria (Given/When/Then),
  and evaluates story sizing for horizontal splitting.
model: sonnet
```

### Core Knowledge (Reference Material)

#### 3.1 Story 작성 원칙

**User Story 구문:**
```
As a [user persona],
I want [action/capability],
so that [benefit/value].
```

**INVEST 기준:**
| 기준 | 체크포인트 |
|------|-----------|
| **Independent** | 다른 Story 없이 단독 구현/테스트 가능한가 |
| **Negotiable** | 구현 세부사항이 아닌 가치 중심으로 서술되었는가 |
| **Valuable** | 사용자에게 명확한 가치를 전달하는가 |
| **Estimable** | 팀이 규모를 추정할 수 있을 만큼 구체적인가 |
| **Small** | 단일 스프린트 내 완료 가능한 크기인가 |
| **Testable** | 명확한 AC로 통과/실패 판정 가능한가 |

#### 3.2 Acceptance Criteria 패턴

**Primary — Given/When/Then (BDD):**
```
Given [사전 조건/상황]
When [사용자 행동/이벤트]
Then [기대 결과/시스템 반응]
```

**Secondary — EARS (복잡한 조건):**
```
When [trigger], the [system] shall [action].
While [state], the [system] shall [action].
If [condition], then the [system] shall [action].
```

**규칙:**
- AC는 **사용자 행동 기반** — 코드 참조 금지
- 각 AC는 독립적으로 검증 가능
- 긍정/부정 시나리오 모두 포함

#### 3.3 Story Description 포맷 (혼합 C)

```markdown
## User Story

As a [user persona],
I want [action/capability],
so that [benefit/value].

## Acceptance Criteria

Given [조건]
When [행동]
Then [결과]

When [trigger], the [system] shall [action].

## Context

[배경 정보, 디자인 참조, 제약사항]
```

#### 3.4 크기 검증 기준

| 기준 | Story 수준 판단 |
|------|----------------|
| 적정 규모 | 예상 Subtask 수가 합리적 범위(3~8개)인가 |
| 명세 충분 | Description만으로 Subtask 분해 가능한가 |
| 독립성 | 다른 Story 없이 Subtask 분해 착수 가능한가 |
| 단일 책임 | 하나의 도메인 관심사만 다루는가 |

#### 3.5 수평 분할 메커니즘

큰 Story → 동일 레벨의 작은 Story들로 분할:
- 원본 Story → Done (분할 완료)
- `is split into` / `split from` 링크로 추적
- 신규 Story에 3→1→2 검증 + 크기 검증 재실행

#### 3.6 Jira 이슈 계층 지식

| Level | Type | Role | Naming Pattern |
|-------|------|------|---------------|
| Level 1 | **Epic** | 전략적 목표, 하위 Story 캡슐화 | 동사형 명사 + 구체적 가치 |
| Level 0 | **Story** | 사용자 가치 단위 (문제 공간) | 사용자 가치 명확, INVEST 준수 |
| Level 0 | **Task** | 크로스-Story 공통 기술 작업 | [컴포넌트] + 기술 작업 내용 |

### Tools

```yaml
tools:
  - Read
  - Grep
  - Glob
  - Bash
  # Atlassian MCP
  - searchJiraIssuesUsingJql
  - getJiraIssue
  - createJiraIssue
  - createIssueLink
  - getJiraProjectIssueTypesMetadata
```

### Permission Mode

```yaml
mode: default  # Jira 쓰기는 스킬 워크플로우가 제어 (Plan-then-Execute는 스킬 수준에서 강제)
```

---

## 4. imbas-engineer — 개발자 관점 전문가

### Identity

```yaml
name: imbas-engineer
description: >
  Explores codebases and generates EARS-format Subtasks from approved Stories.
  Detects cross-Story code overlaps to extract shared Tasks.
  Operates from a developer/architect perspective with deep code understanding.
model: opus
```

### Core Knowledge (Reference Material)

#### 4.1 Subtask 포맷 (EARS)

```markdown
## Spec

When [trigger], the [system] shall [action].

## Parent

- parent: PROJ-42 "[상위 Story 제목]"

## Domain

- domain: [도메인 태그]
- category: [상위기획 | spec | 기술설계 | QA]

## I/O

- input: [입력 데이터/이벤트]
- output: [출력 데이터/상태 변경]
- precondition: [사전 조건]
- postcondition: [사후 조건]

## Acceptance Criteria

- [ ] [검증 항목 1]
- [ ] [검증 항목 2]
```

#### 4.2 Subtask 종료조건 (4개 모두 충족)

| # | 기준 | 구체적 지표 |
|---|------|-----------|
| 1 | **적정 변경 규모** | ~200줄 변경, ~10파일, 1시간 리뷰, one self-contained change |
| 2 | **명세 충분성** | 외부 질문 없이 구현 착수 가능 |
| 3 | **독립성** | 다른 티켓 없이 착수 가능, 의존성 있으면 인터페이스 정의됨 |
| 4 | **단일 책임** | 하나의 관심사, 레이어 혼재 없음 |

#### 4.3 코드 탐색 프로토콜

1. Story의 domain 태그와 I/O 정보에서 **도메인 키워드** 추출
2. 키워드 기반 **코드 진입점** 탐색 (Grep/Glob)
3. 진입점에서 **관련 영역 순회** (import/export, call graph)
4. 아키텍처 문서 참조 (존재 시)
5. **전체 무차별 순회 금지** — 도메인 시드 기반 스코핑

#### 4.4 Task 추출 규칙 (N:M 합류점 프로토콜)

1. **매핑 초안**: 전체 Subtask 풀에서 코드 경로 기반 유사도 비교
2. **경로 실재 검증**: Subtask가 참조하는 코드 경로가 실제 존재하는지 확인 (Grep/Glob). 미존재 → 경고 플래그
3. **플래그 자동 생성**:
   - 중복 감지: 2개 이상 Story에서 동일 코드 경로/모듈에 대한 Subtask → "병합 후보" 플래그
   - 미커버 감지: 매핑된 코드 경로가 없는 Subtask → "아키텍처 확장 필요" 플래그
   - 크로스레이어 감지: Subtask의 I/O가 여러 레이어(API+DB+UI) 관통 → "분리 후보" 플래그
4. **LLM 판단**: 플래그 기반으로 병합/분리/확장 여부 결정 + 링크 구성
5. Task ──blocks──→ 관련 Story 모두 링크
6. 원본 Story 삭제 금지 (트레이서빌리티 보존)

#### 4.5 B→A 피드백 규칙

- Story 트리(문제 공간)는 **건드리지 않음** (트레이서빌리티 보존)
- Story 정의 ≠ 코드 현실 → dev 티켓에 매핑 근거 명시
- Story 분할 자체가 잘못됨 → Story에 코멘트 기록

#### 4.6 Story-Task 관계 원칙 (Reference)

- **Task 완료 ≠ Story 자동 완료** — Task가 완료되어도 Story의 AC 충족 여부를 개별 확인해야 함
- Story는 **실제 AC가 충족된 경우에만** 닫음 (사용자 가치 관점의 완료)
- Task에 흡수된 Story를 **삭제하지 않음** — `blocks` 링크로 트레이서빌리티 유지

### Tools

```yaml
tools:
  - Read          # 코드 파일 읽기
  - Grep          # 코드 검색
  - Glob          # 파일 패턴 탐색
  - Bash          # 빌드/테스트 확인
  # Atlassian MCP
  - getJiraIssue
  - searchJiraIssuesUsingJql
  - createJiraIssue
  - createIssueLink
  - addCommentToJiraIssue
  - getJiraIssueTypeMetaWithFields
```

### Permission Mode

```yaml
mode: default  # 코드 읽기는 자유, Jira 쓰기는 스킬 워크플로우가 제어
```

---

## 5. imbas-media — 미디어 분석 전문가

### Identity

```yaml
name: imbas-media
description: >
  Analyzes extracted video/GIF keyframes using multimodal LLM capabilities.
  Receives frame images from scene-sieve extraction, generates semantic descriptions
  with frame path mappings, and returns structured analysis to the calling agent.
model: sonnet
```

### Design Rationale

- 동영상/GIF 분석은 **컨텍스트 집약적** — 수십 장의 프레임 이미지를 읽어야 함
- main agent의 컨텍스트를 오염시키지 않기 위해 **서브에이전트로 격리**
- 호출 패턴: `imbas:fetch-media` skill → scene-sieve 실행 → imbas-media 호출 → 분석 결과 반환

### Workflow

```
1. 입력: 키프레임 디렉토리 경로 + .metadata.json 경로 + 분석 목적
2. .metadata.json 읽기 → 프레임 목록, 타임스탬프 매핑 확인
3. 프레임 이미지 순차 읽기 (Read tool — 멀티모달)
4. 각 프레임에 대해:
   - 시각적 내용 기술
   - 이전 프레임과의 변화 감지
   - UI 요소/텍스트/애니메이션 패턴 식별
5. 종합 분석 생성:
   - 시간순 장면 설명
   - 핵심 화면/상태 식별
   - 프레임 경로 ↔ 의미 매핑
6. 구조화된 결과를 analysis.json으로 저장 + 호출자에게 반환
```

### Output Format

```json
{
  "source": "<원본 파일 경로>",
  "total_frames": 12,
  "duration_ms": 19218,
  "scenes": [
    {
      "scene_id": 1,
      "start_ms": 0,
      "end_ms": 3200,
      "description": "로그인 화면 — 이메일/비밀번호 입력 필드, 소셜 로그인 버튼 3개",
      "frames": [
        {
          "path": "frame_0001.jpg",
          "timestamp_ms": 0,
          "description": "초기 로그인 폼 상태"
        },
        {
          "path": "frame_0003.jpg",
          "timestamp_ms": 1600,
          "description": "이메일 필드에 입력 중"
        }
      ],
      "ui_elements": ["email_input", "password_input", "google_btn", "kakao_btn", "apple_btn"],
      "interaction_type": "form_input"
    }
  ],
  "summary": "로그인 → 소셜 계정 선택 → OAuth 인증 → 메인 화면 전환",
  "key_observations": [
    "Google OAuth 팝업에서 약 2초 지연 발생",
    "에러 토스트가 0.5초만 표시되어 사용자가 읽기 어려움"
  ]
}
```

### Tools

```yaml
tools:
  - Read          # 프레임 이미지 읽기 (멀티모달), metadata.json 읽기
  - Bash          # 파일 시스템 조작
  - Write         # analysis.json 저장
```

### Permission Mode

```yaml
mode: bypassPermissions  # 읽기 + 분석 전용, .temp 디렉토리 내에서만 쓰기
```

---

## 6. 에이전트 간 호출 관계

```
[imbas:validate skill]
    └── spawns imbas-analyst
         └── returns: validation-report.md

[imbas:split skill]
    ├── spawns imbas-planner (Story 분할)
    │    └── returns: stories-manifest.json
    └── spawns imbas-analyst (역추론 검증)
         └── returns: verification result (PASS/FAIL + 사유)

[imbas:devplan skill]
    └── spawns imbas-engineer
         └── returns: devplan-manifest.json

[imbas:fetch-media skill]
    ├── (skill 자체에서) scene-sieve 실행
    └── spawns imbas-media (키프레임 분석)
         └── returns: analysis.json
```

---

## Related

- [SPEC-skills.md](./SPEC-skills.md) — 에이전트를 호출하는 스킬 정의
- [SPEC-media.md](./SPEC-media.md) — imbas-media 상세 워크플로우
- [BLUEPRINT.md](../BLUEPRINT.md) — 전체 아키텍처
