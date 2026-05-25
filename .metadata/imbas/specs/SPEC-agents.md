# SPEC-agents — imbas Agent 설계

> Status: Draft v1.1 (2026-04-04) — Synced with agent implementations
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
| ~~**imbas-media**~~ | *migrated to `@ogham/atlassian` as `media` agent* | — | — |

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

#### 2.1 검증 유형 5종

| 유형 | 정의 | 감지 방법 |
|------|------|----------|
| **모순 (Contradiction)** | 같은 대상에 양립 불가능한 요구 | 문서 내 교차 비교 — 동일 엔티티/행위에 대한 상충 조건 탐색 |
| **이격 (Divergence)** | 상위-하위 간 논리적 단절 | 상위 목표→하위 스펙 트레이싱 — 추상도 변환 시 의미 변형 감지 |
| **누락 (Omission)** | 논리적으로 있어야 하는 스펙 | 입력-출력 체인 검사 — 에러 케이스, 경계값, 전이 조건 누락 |
| **논리적 불능 (Infeasibility)** | 원리적으로 불가능한 요구 | LLM 판단 — 물리적/논리적 제약 위반 |
| **테스트 가능성 (Testability)** | 측정 가능한 인수 조건 부재 | 요구사항별 AC 존재 여부 확인 — BDD Given/When/Then, 구체적 수치, 합격/불합격 기준 누락 |

#### 2.2 리포트 템플릿

```markdown
# imbas Validation Report
source: [문서 식별자]
date: YYYY-MM-DD
status: PASS | PASS_WITH_WARNINGS | BLOCKED

## Contradiction (N건)
### V-C01: [제목]
- 위치 A: "[인용]" (섹션 X)
- 위치 B: "[인용]" (섹션 Y)
- 판정: 양립 불가 — [근거]
- 심각도: BLOCKING | WARNING

## Divergence (N건)
### V-D01: [제목]
- 상위: "[인용]" (섹션 X)
- 하위: "[인용]" (섹션 Y)
- 판정: 논리적 단절 — [근거]

## Omission (N건)
### V-M01: [제목]
- 맥락: "[인용]" (섹션 X)
- 기대 스펙: [논리적으로 있어야 할 내용]
- 판정: 미정의 — [근거]

## Infeasibility (N건)
### V-I01: [제목]
- 위치: "[인용]" (섹션 X)
- 판정: 원리적 불가 — [근거]

## Testability (N건)
### V-T01: [제목]
- 위치: "[인용]" (섹션 X)
- 기대: 측정 가능한 인수 조건 (Given/When/Then, 구체적 수치, 합격/불합격 기준)
- 발견: [모호한 기술 — 테스트 가능한 기준 없음]
- 심각도: WARNING

## Passed Items Summary
[정상 판정 영역 목록]
```

> **Language Rule:** Report section headings and body text follow `config.language.reports` setting. The template above shows English headings as fallback default. When `config.language.reports` is set (e.g., `"ko"`), headings and content are written in that language.

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
  - Bash          # GitHub provider (gh CLI)
  # Provider Operations ([OP:]) — examples shown for Jira/Confluence semantic reads
  # v0.2.0: agent tools: frontmatter에 더 이상 포함되지 않음 — 런타임에 [OP:] 표기로 해석됨
  - "[OP: get_confluence]"
  - "[OP: search_confluence]"
  - "[OP: get_issue]"
  - "[OP: search_jql]"
```

### Permission Mode

```yaml
mode: default  # 읽기 전용이지만, bypassPermissions는 권한 리스크로 불채택
```

---

## 3. imbas-planner — 기획/제품 관점 전문가

### Identity

```yaml
name: imbas-planner
description: >
  Decomposes planning documents into implementation-ready Stories from a product/business perspective.
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
| **기능적 완결성 (E2E)** | 자체 브랜치에서 E2E 테스트가 가능한 기능적 완결성(배포 단위)을 갖추었는가? (Subtask 개수로 임의 분할 금지) |
| **명세 충분** | Description만으로 Subtask 분해 가능한가 |
| **독립성** | 다른 Story 없이 Subtask 분해 착수 가능한가 |
| **단일 책임** | 하나의 도메인 관심사만 다루는가 |

#### 3.5 수평 분할 메커니즘

큰 Story → 동일 레벨의 작은 Story들로 분할:
- **원칙**: 분할 후에도 각 Story가 독립적으로 테스트 가능해야 함. 테스트 불가능한 조각으로 쪼개지 않음.
- 원본 Story → Done (분할 완료)
- `is split into` / `split from` 링크로 추적
- 신규 Story에 3→1→2 검증 + 크기 검증 재실행

#### 3.6 탈출 조건

분할을 중단하고 사용자에게 반환해야 하는 상황:

| Code | Condition | Action |
|------|-----------|--------|
| E2-1 | 구체화 필요 | 부족 정보 목록 + 인간 보완 요청 |
| E2-2 | 모순/충돌 | 충돌 지점 명시 + 인간 의사결정 요청 |
| E2-3 | 분할 불필요 | Phase 3 직행 (단일 Story로 충분) |
| EC-1 | 이해 불가 | 범위 동결 + 질의 구조화 |
| EC-2 | 원본 결함 | 결함 리포트 (Phase 1 재진입 권고) |

탈출 시 매니페스트에 `status: "escaped"` + `escape_code` + `escape_reason` 기록.

#### 3.7 이슈 계층 지식

| Level | Type | Role | Naming Pattern |
|-------|------|------|---------------|
| Level 1 | **Epic** | 전략적 목표, 하위 Story 캡슐화 | 동사형 명사 + 구체적 가치 |
| Level 0 | **Story** | 사용자 가치 단위 (문제 공간) | 사용자 가치 명확, INVEST 준수 |
| Level 0 | **Task** | 크로스-Story 공통 기술 작업 | [컴포넌트] + 기술 작업 내용 |

#### 3.8 도메인 컨텍스트 유지 및 블로킹 매핑

1. **원본 병행 참조**: `validation-report.md`를 주 앵커로 삼되, 기획적 배경(Why) 유실을 막기 위해 `source.md`를 항상 읽기 전용으로 참조한다.
2. **Story 선후 관계(`blocks`) 판단**: 분할 과정에서 기획 내 의존성을 스스로 판단하여, API 구현이 UI보다 선행되어야 하는 등의 **Story ↔ Story 간 `blocks` 매핑**을 매니페스트에 선제적으로 추가한다.

### Tools

```yaml
tools:
  - Read
  - Grep
  - Glob
  # Provider Operations ([OP:]) — 읽기 전용, 실제 provider 쓰기는 manifest 스킬에서 수행
  # v0.2.0: agent tools: frontmatter에 더 이상 포함되지 않음 — 런타임에 [OP:] 표기로 해석됨
  - "[OP: search_jql]"
  - "[OP: get_issue]"
```

### Permission Mode

```yaml
mode: default  # Plan-then-Execute: 에이전트는 매니페스트만 생성, provider 쓰기는 스킬 수준에서 제어
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
2. 키워드 기반 **코드 진입점** 탐색 (Grep/Glob) (도메인 이해를 위해 `source.md` 병행 참조)
3. 진입점에서 **관련 영역 순회** (import/export, call graph)
4. 아키텍처 문서 참조 (존재 시)
5. **전체 무차별 순회 금지** — 도메인 시드 기반 스코핑
6. **탈출 경로 (Blocked Report)** — 탐색 중 선행 핵심 종속성 누락이나 구조적 제약으로 구현이 불가하다고 판단될 경우, 억지로 Task를 만들지 않고 즉시 중단 후 `devplan-blocked-report.md`를 생성한다.

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
- 피드백은 `devplan-manifest.json`의 `feedback_comments` 필드에 구조화:
  ```json
  "feedback_comments": [
    {
      "target_story": "PROJ-42",
      "type": "discrepancy | split_issue",
      "message": "Story assumes REST API, but codebase uses GraphQL — implementing GraphQL-adjusted approach",
      "subtask_ref": "S1-ST2"
    }
  ]
  ```

#### 4.6 AST Fallback 프로토콜

AST 도구(`ast_search`, `ast_analyze`)가 `@ast-grep/napi` 미설치 오류를 반환할 경우, LLM 기반 분석으로 대체:

| Native Tool | Fallback |
|-------------|----------|
| `ast_search` | 메타변수를 정규식으로 변환 → Grep → LLM이 false positive 필터링 |
| `ast_analyze` (dependency-graph) | Read → LLM이 import/export/call 패턴 추출 |
| `ast_analyze` (cyclomatic-complexity) | Read → LLM이 분기문 카운트 |

**메타변수 변환**: `$NAME`/`$VALUE` → `[\w.]+`, `$TYPE` → `[\w.<>,\[\] ]+`, `$$$ARGS`/`$$$BODY` → `[\s\S]*?`

**제한사항**: 텍스트 매칭만 가능 (코멘트/문자열 내 false positive — LLM 판단으로 필터). 관련 디렉토리로 Grep 범위 제한. 타입 인식/규칙 기반 매칭 불가. 근사 결과임을 exploration log에 기록.

Fallback 활성화 시 1회 `[WARN] AST fallback activated` 출력.

#### 4.7 Story-Task 관계 원칙 (Reference)

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
  # imbas MCP (AST 코드 분석)
  - ast_search
  - ast_analyze
  # Provider Operations ([OP:]) — 읽기 전용, 실제 provider 쓰기는 manifest 스킬에서 수행
  # v0.2.0: agent tools: frontmatter에 더 이상 포함되지 않음 — 런타임에 [OP:] 표기로 해석됨
  - "[OP: get_issue]"
  - "[OP: search_jql]"
```

### Permission Mode

```yaml
mode: default  # Plan-then-Execute: 에이전트는 매니페스트만 생성, provider 쓰기는 스킬 수준에서 제어
```

---

## 5. ~~imbas-media~~ → `@ogham/atlassian` media agent

> **Migrated** — 이 에이전트는 `@ogham/atlassian` 패키지로 이전되었습니다.
> 새 위치: `packages/atlassian/agents/media.md`
> 호출 스킬: `/atlassian:atlassian-media-analysis`
> 커밋: 9c2c45c

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

### Frame Gap Handling

scene-sieve는 시각적으로 유사한 프레임을 pruning하므로, 프레임 번호에 갭이 발생할 수 있다 (e.g., frame_0001 → frame_0003).
- 타이밍 계산은 항상 `.metadata.json`의 `timestampMs` 사용 — 프레임 번호 산술 금지
- 큰 갭은 분석에 기록: "12-frame gap ≈ 2.4s of static screen"
- pruning된 프레임은 시각적으로 중복되어 제거된 것 — 중요 내용이 있다고 가정하지 않음

### Tools

```yaml
tools:
  - Read          # 프레임 이미지 읽기 (멀티모달), metadata.json 읽기
  - Glob          # 프레임 파일 탐색
  - Write         # analysis.json 저장
```

### Permission Mode

```yaml
mode: default  # 격리된 서브에이전트이지만, bypassPermissions는 권한 리스크로 불채택
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

[atlassian:atlassian-media-analysis skill] (migrated to @ogham/atlassian)
    ├── (skill 자체에서) scene-sieve 실행
    └── spawns atlassian media agent (키프레임 분석)
         └── returns: analysis.json
```

---

## Related

- [SPEC-skills.md](./SPEC-skills.md) — 에이전트를 호출하는 스킬 정의
- [SPEC-media.md](./SPEC-media.md) — 미디어 분석 워크플로우 (migrated to @ogham/atlassian)
- [BLUEPRINT.md](../BLUEPRINT.md) — 전체 아키텍처
