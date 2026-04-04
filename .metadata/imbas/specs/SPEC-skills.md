# SPEC-skills — imbas Skill 정의

> Status: Draft v1.1 (2026-04-04)
> Parent: [BLUEPRINT.md](../BLUEPRINT.md)

---

## 1. 스킬 목록 총괄

### 1.1 User-invocable Skills (사용자 직접 호출, 8개)

사용자에게 slash command로 노출되는 스킬. 플러그인 설치 시 이 7개만 사용자에게 보임.

| Skill | Slash Command | 역할 | Agent |
|-------|-------------|------|-------|
| **setup** | `/imbas:setup` | 초기화, config, 프로젝트 캐시 | — |
| **validate** | `/imbas:validate` | Phase 1 — 정합성 검증 | imbas-analyst |
| **split** | `/imbas:split` | Phase 2 — Story 분할 | imbas-planner + imbas-analyst |
| **devplan** | `/imbas:devplan` | Phase 3 — Subtask/Task 생성 | imbas-engineer |
| **manifest** | `/imbas:manifest` | 매니페스트 → Jira 배치 생성 | — |
| **status** | `/imbas:status` | 런 상태 조회, 이력 | — |
| **fetch-media** | `/imbas:fetch-media` | 미디어 다운로드 + 분석 | imbas-media |
| **digest** | `/imbas:digest` | 이슈 컨텍스트 압축 → Jira 코멘트 | — |

### 1.2 Internal Skills (내부 전용, 2개)

`user_invocable: false`. 사용자에게 노출되지 않음. 다른 스킬이나 에이전트가 내부적으로 호출.

| Skill | 호출자 | 역할 | Agent |
|-------|--------|------|-------|
| **read-issue** | validate, split, devplan, engineer agent | 이슈 본문 + 코멘트 대화 맥락 구조화 | — |
| **cache** | setup, validate, split, devplan | Jira 메타데이터 캐시 자동 갱신/조회 | — |

**총 10개 스킬** (user-invocable 8 + internal 2).

---

## 2. Core Workflow Skills

### 2.1 imbas:validate — Phase 1 정합성 검증

```yaml
name: imbas-validate
user_invocable: true
description: >
  Phase 1 of the imbas pipeline. Validates a planning document for contradictions,
  divergences, omissions, and logical infeasibilities. Produces a markdown validation report.
  Trigger: "validate spec", "check document", "정합성 검증", "문서 검증"
complexity: moderate
plugin: imbas
```

**Arguments:**
```
/imbas:validate <source>  [--project <KEY>] [--supplements <path,...>]

<source>       : 기획 문서 경로 (로컬 md/txt) 또는 Confluence URL
--project      : 프로젝트 참조 (config.defaults.project_ref 대체)
--supplements  : 보조 자료 경로 (콤마 구분)
```

**Workflow:**

```
Step 1 — Run 초기화
  1. config.json 로드
  2. 프로젝트 키 결정 (인자 > config.defaults)
  3. run-id 생성 (YYYYMMDD-NNN)
  4. .imbas/<KEY>/runs/<run-id>/ 디렉토리 생성
  5. state.json 초기화 (current_phase: "validate", validate.status: "in_progress")
  6. 원본 문서 → source.md 복사 (원본 불변 원칙)
  7. 보조 자료 → supplements/ 복사

Step 2 — 문서 소스 해석
  - 로컬 파일: 직접 읽기
  - Confluence URL: getConfluencePage로 마크다운 변환 후 저장
  - 첨부 미디어 감지 → imbas:fetch-media 호출 안내 (자동 호출 안 함)

Step 3 — imbas-analyst 호출
  - Agent 호출: imbas-analyst
  - 입력: source.md + supplements/
  - 지시: 4종 검증 (모순/이격/누락/논리적 불능) 수행
  - 출력: validation-report.md

Step 4 — 결과 평가 & 게이트
  - BLOCKING 이슈 존재 → state.json: validate.result = "BLOCKED"
  - WARNING만 존재 (BLOCKING 없음) → state.json: validate.result = "PASS_WITH_WARNINGS"
  - 이슈 없음 → state.json: validate.result = "PASS"
  - 사용자에게 리포트 요약 표시

Step 5 — 상태 갱신
  - state.json: validate.status = "completed"
  - PASS / PASS_WITH_WARNINGS → "Phase 2(split) 진행 가능" 안내 (WARNING 시 경고 목록 표시)
  - BLOCKED → "원본 수정 후 재검증 필요" 안내 + 블로킹 이슈 목록
```

**Output:** `validation-report.md` (리포트 포맷은 SPEC-agents.md §2.2 참조)

---

### 2.2 imbas:split — Phase 2 Story 분할

```yaml
name: imbas-split
user_invocable: true
description: >
  Phase 2 of the imbas pipeline. Splits a validated document into INVEST-compliant
  Jira Stories. Applies 3→1→2 verification, size checks, and horizontal splitting.
  Trigger: "split stories", "story 분할", "Phase 2", "imbas split"
complexity: complex
plugin: imbas
```

**Arguments:**
```
/imbas:split [--run <run-id>] [--epic <EPIC-KEY>]

--run    : 기존 런 ID (없으면 가장 최근 PASS된 런 사용)
--epic   : Epic Jira 키 (없으면 새 Epic 생성 여부 확인)
```

**전제조건:** state.json에서 `validate.status == "completed"` && `validate.result in ["PASS", "PASS_WITH_WARNINGS"]`

**Workflow:**

```
Step 1 — 런 로드 & 전제조건 확인
  1. state.json 로드
  2. validate 완료 + PASS 확인 (미충족 → 에러 + 안내)
  3. state.json: current_phase = "split", split.status = "in_progress"

Step 2 — Epic 결정
  - --epic 제공 → getJiraIssue로 존재 확인
  - 미제공 → 사용자에게 Epic 생성 여부 질의
    - 생성 → 매니페스트에 Epic 추가 (manifest 실행 시 생성)
    - 기존 사용 → 키 입력

Step 3 — imbas-planner 호출 (Story 분할)
  - Agent 호출: imbas-planner
  - 입력: source.md + supplements/ + Epic 정보
  - 지시:
    - INVEST 기준으로 Story 분할
    - Story Description = User Story + AC (Given/When/Then or EARS)
    - 각 Story에 원본 문서 근거 링크(섹션/인용) 명시
  - 출력: Story 목록 (JSON)

Step 4 — 3→1→2 검증 (각 Story에 대해)
  [3] 근거 링크 확인
    - 없음 → 리뷰 격상 플래그
    - 있음 → 계속
  [1] 상위 문맥 정합성 (코드 검증, 저비용)
    - 이탈 → 리뷰 격상 플래그
    - 정합 → 계속
  [2] 역추론 검증 — imbas-analyst 호출
    - 분할된 Story 전체 재조합 → 원본과 비교
    - 불일치 → 리뷰 격상 플래그
    - 일치 → 자율 통과

  자율/리뷰 판단 기준:
    - 기준 A: 분할 결과가 하나의 해석만 가능 → 자율 통과
    - 기준 B: 상위 티켓에 명시된 내용의 재구성 → 자율, 추론이 개입된 경우 → 리뷰 격상

Step 4.5 — 탈출 조건 확인
  분할 과정에서 다음 상황 감지 시 즉시 탈출 (리포트 생성):
  | 코드 | 상황 | 액션 |
  |------|------|------|
  | E2-1 | 구체화 필요 — 정보 부족 | 부족 정보 목록 + 인간 보완 요청 |
  | E2-2 | 모순/충돌 발견 | 충돌 지점 명시 + 인간 의사결정 요청 |
  | E2-3 | 분할 불필요 — 이미 적정 크기 | Phase 3 직행 |
  | EC-1 | 이해 불가 — 해석 불능 | 범위 동결 + 질의 구조화 |
  | EC-2 | 원본 결함 발견 | 결함 리포트 (Phase 1 재검증 권고) |
  탈출 시: state.json: split.status = "escaped", split.escape_code = "[코드]"
  → 사용자에게 구조화된 리포트 출력 ("탈출은 리포트" 원칙)

Step 5 — 크기 검증
  각 Story에 대해 4가지 기준 확인:
  - 적정 규모, 명세 충분, 독립성, 단일 책임
  - 미충족 → 원인에 따라 분기:
    (a) 크기 초과 → **수평 분할** 실행
      - imbas-planner 재호출 (해당 Story만)
      - 원본 Story → Done 처리 예정 + `is split into` / `split from` 링크
      - 신규 Story에 3→1→2 + 크기 검증 반복
    (b) 개념적으로 하위 Story 필요 → **umbrella 패턴** 실행
      - 원본 Story를 umbrella로 유지 (삭제/Done 하지 않음)
      - 하위 Story 생성 + `relates to` 링크로 연결
      - 실제 Subtask는 하위 Story에만 생성, umbrella에는 생성하지 않음

Step 6 — stories-manifest.json 생성
  - 전체 Story 목록 + 검증 결과 + 링크 정보
  - 리뷰 격상 Story 표시

Step 7 — 사용자 리뷰
  - 매니페스트 요약 표시 (Story 수, 리뷰 필요 항목, 분할 이력)
  - 사용자 승인 대기
  - 승인 → state.json: split.status = "completed", split.pending_review = false
  - 수정 요청 → Step 3으로 재진입 (해당 Story만)
```

**Output:** `stories-manifest.json` (스키마는 SPEC-state.md §6 참조)

---

### 2.3 imbas:devplan — Phase 3 Subtask/Task 생성

```yaml
name: imbas-devplan
user_invocable: true
description: >
  Phase 3 of the imbas pipeline. Generates EARS-format Subtasks and extracts
  cross-Story Tasks by exploring the local codebase. Operates on approved Stories only.
  Trigger: "create devplan", "dev 계획", "Phase 3", "subtask 생성"
complexity: complex
plugin: imbas
```

**Arguments:**
```
/imbas:devplan [--run <run-id>] [--stories <S1,S2,...>]

--run      : 런 ID
--stories  : 대상 Story ID (콤마 구분, 없으면 전체)
```

**전제조건:** state.json에서 `split.status == "completed"` && `split.pending_review == false`

**Workflow:**

```
Step 1 — 런 로드 & 매니페스트 확인
  1. state.json 로드 + stories-manifest.json 로드
  2. split 완료 + 리뷰 승인 확인
  3. stories-manifest.json의 Story 항목 상태 확인:
     - 모든 Story가 `created` (issue_ref 존재) → 정상 진행
     - `pending` 항목 존재 → "imbas:manifest stories 먼저 실행 필요" 안내 + 블로킹
  4. state.json: current_phase = "devplan", devplan.status = "in_progress"

Step 2 — imbas-engineer 호출
  - Agent 호출: imbas-engineer
  - 입력:
    - stories-manifest.json (주 앵커)
    - source.md (읽기 전용 참조 컨텍스트)
    - 로컬 코드베이스 루트 경로
    - (선택) 아키텍처 문서 경로
    - config.json의 subtask_limits
  - 지시:
    Step 2a. Story별 코드 탐색 (의존성 누락/구조적 제약 발견 시 즉시 탈출)
    Step 2b. Story별 Subtask 초안 (EARS)
      - 종료조건 4개 모두 충족 확인
    Step 2c. 전체 Subtask 풀 중복 감지
      - 코드 경로 기반 유사도 비교
    Step 2d. Task 후보 추출
      - 임계값 초과 중복 → Task + blocks 링크
    Step 2e. devplan-manifest.json 생성 (또는 진행 불가 시 devplan-blocked-report.md 생성)
  - 출력: devplan-manifest.json 또는 devplan-blocked-report.md

Step 3 — B→A 피드백 수집
  - Story 정의 ≠ 코드 현실인 경우 → devplan-manifest.json의 feedback_comments 필드에 기록
  - type: mapping_divergence (매핑 불일치) | story_split_issue (분할 문제)
  - 문제 공간 트리 미변경 원칙 — Story 자체는 수정하지 않음, 코멘트로 기록

Step 4 — 사용자 리뷰
  - 매니페스트 요약 표시:
    - Task 수, Story별 Subtask 수
    - 실행 순서 (execution_order)
    - B→A 피드백 항목 (있으면)
  - 사용자 승인 대기
  - 승인 → state.json: devplan.status = "completed", devplan.pending_review = false
```

**Output:** `devplan-manifest.json` (스키마는 SPEC-state.md §6 참조)

---

## 3. Infrastructure Skills

### 3.1 imbas:setup — 초기화 & 설정

```yaml
name: imbas-setup
user_invocable: true
description: >
  Initialize .imbas/ directory, create config.json, and cache Jira project metadata.
  Supports subcommands: init, show, set-project, set-language, refresh-cache.
  Trigger: "setup imbas", "imbas 설정", "imbas init"
complexity: simple
plugin: imbas
```

**Subcommands:**

| Command | 동작 |
|---------|------|
| `init` (default) | 대화형 초기화 — 프로젝트 키, 언어 설정 → config.json 생성 + 캐시 |
| `show` | config.json + 캐시 상태 표시 |
| `set-project <KEY>` | 기본 프로젝트 변경 + 캐시 갱신 |
| `set-language <field> <lang>` | 언어 설정 변경 |
| `refresh-cache [KEY]` | 캐시 강제 갱신 |
| `clear-temp` | `.imbas/.temp/` 디렉토리 삭제 (미디어 임시 파일 정리) |

**Init Workflow:**

```
Step 1 — .imbas/ 디렉토리 생성
Step 2 — 사용자에게 Jira 프로젝트 키 질의
  - getVisibleJiraProjects로 사용 가능 프로젝트 목록 표시
  - 사용자 선택
Step 3 — config.json 생성 (기본값 + 사용자 선택)
Step 4 — 프로젝트 캐시 갱신
  - .imbas/<KEY>/cache/ 디렉토리 생성
  - Jira 메타데이터 수집 (issue-types, link-types, workflows)
Step 5 — .gitignore 가드 (setup-lens 패턴)
  - git repo 확인 → .imbas/ ignore 등록
Step 6 — 결과 표시
```

**참고:** setup-lens 패턴 (`/Users/Vincent/Workspace/ogham/packages/maencof-lens/skills/setup-lens/SKILL.md`) 구조를 따름.

---

### 3.2 imbas:status — 런 상태 조회

```yaml
name: imbas-status
user_invocable: true
description: >
  Show current or historical imbas run status, including phase progress,
  manifest summaries, and blocking issues.
  Trigger: "imbas status", "런 상태", "imbas 진행상황"
complexity: simple
plugin: imbas
```

**Subcommands:**

| Command | 동작 |
|---------|------|
| (default) | 가장 최근 런의 상태 표시 |
| `list` | 모든 런 ID + 상태 요약 |
| `<run-id>` | 특정 런 상세 표시 |
| `resume <run-id>` | 중단된 런 재개 (다음 Phase 안내) |

---

## 4. Execution Skill

### 4.1 imbas:manifest — 매니페스트 실행

```yaml
name: imbas-manifest
user_invocable: true
description: >
  Execute a stories-manifest or devplan-manifest to batch-create Jira issues.
  Supports dry-run, resume from failure, and selective execution.
  Trigger: "execute manifest", "매니페스트 실행", "jira 생성"
complexity: moderate
plugin: imbas
```

**Arguments:**
```
/imbas:manifest <type> [--run <run-id>] [--dry-run]

<type>    : "stories" | "devplan"
--run     : 런 ID (없으면 최근)
--dry-run : 실제 생성 없이 실행 계획만 표시
```

**Workflow:**

```
Step 1 — 매니페스트 로드
  - type에 따라 stories-manifest.json 또는 devplan-manifest.json
  - pending 항목 수 확인

Step 2 — Dry Run (--dry-run 시)
  - 생성 예정 항목 표시 (타입, 제목, 링크)
  - 종료

Step 3 — 실행 확인
  - 사용자에게 생성 항목 수 + 프로젝트 키 표시
  - 명시적 확인 대기

Step 4 — 배치 실행
  - devplan일 경우 execution_order 순서 따름:
    1. Task 생성
    2. Task Subtask 생성
    3. Story↔Task 블로킹 링크 생성
    4. Story Subtask 생성
    5. B→A 피드백 코멘트 (feedback_comments → addCommentToJiraIssue)
  - stories일 경우:
    1. Epic 생성 (필요 시)
    2. Story 생성
    3. Split 링크 생성 (links[].to가 배열인 경우 순회하여 개별 링크 생성)
       ```
       for each link in manifest.links where status == "pending":
         for each target in link.to:   // 1:N 확장
           createIssueLink(link.type, resolve(link.from), resolve(target))
         link.status = "created"
         save manifest
       ```
  - 각 항목 생성(API 성공) 즉시 manifest JSON 파일을 디스크에 덮어쓰기(Unit Save) 하여 네트워크 단절 시 티켓 중복 생성 방지 및 멱등성 보장

Step 5 — 결과 리포트
  - 생성된 이슈 수, 실패 수
  - 실패 항목 목록 + 재시도 안내
```

**멱등성:** issue_ref가 이미 있는 항목은 스킵. 중단 후 재실행 안전.

> **Provider별 실행 경로:** manifest 스킬의 provider 분기 상세는 [SPEC-provider.md](./SPEC-provider.md) §4 참조.

---

## 5. Utility Skills

### 5.1 imbas:fetch-media — 미디어 다운로드 & 분석

```yaml
name: imbas-fetch-media
user_invocable: true
description: >
  Download images, videos, and GIFs from Confluence/Jira. For video/GIF files,
  extracts keyframes using scene-sieve and runs semantic analysis via imbas-media agent.
  Trigger: "download media", "미디어 다운로드", "fetch attachment", "영상 분석"
complexity: moderate
plugin: imbas
```

**Arguments:**
```
/imbas:fetch-media <url-or-path> [--analyze] [--preset <name>]

<url-or-path>  : Confluence 첨부 URL, Jira 첨부 URL, 또는 로컬 파일 경로
--analyze      : 비디오/GIF인 경우 scene-sieve + imbas-media 분석 실행
--preset       : scene-sieve 프리셋 오버라이드 (default: auto-detect)
```

**상세 설계는 [SPEC-media.md](./SPEC-media.md) 참조.**

---

## 6. Internal Skills

### 6.1 imbas:read-issue — 이슈 컨텍스트 구조화 (내부 전용)

```yaml
name: imbas-read-issue
user_invocable: false
description: >
  Internal skill. Reads a Jira issue with its full comment thread, reconstructs
  the conversation context (who said what, decisions made, latest state), and
  returns a structured JSON summary. Caches results per project for reuse across phases.
complexity: moderate
plugin: imbas
```

**호출 인터페이스:**
```
imbas:read-issue <issue-key> [--no-cache] [--depth shallow|full]

<issue-key>  : Jira 이슈 키 (e.g., PROJ-123)
--no-cache   : 캐시 무시, 강제 재조회
--depth      : shallow = 본문+메타만, full = 코멘트 포함 (default: full)
```

**Workflow:**

```
Step 1 — 이슈 조회
  - getJiraIssue(issueIdOrKey) → 본문, 메타데이터, 코멘트
  - depth == "shallow" → 코멘트 파싱 스킵 → Step 5

Step 2 — digest 코멘트 탐색 (Fast Path)
  - 코멘트에서 imbas:digest 마커 검색:
    <!-- imbas:digest v1 | generated: ... | comments_covered: 1-N -->
  - 발견 시 → Fast Path:
    a. digest 코멘트 파싱 → 구조화된 decisions/constraints/rejected/summary 추출
    b. comments_covered 범위 확인 (예: 1-15)
    c. digest 이후 신규 코멘트만 추가 분석 (16번째~)
    d. 신규 코멘트가 없으면 → digest 내용만으로 결과 구성 → Step 5
    e. 신규 코멘트가 있으면 → 신규분만 Step 3-4 처리 후 digest와 병합
  - 미발견 → Full Path: Step 3으로

Step 3 — 코멘트 대화 재구성 (Full Path)
  - 코멘트를 시간순 정렬
  - 각 코멘트에서 추출:
    - author (displayName)
    - created (타임스탬프)
    - body (본문)
  - 대화 흐름 분석:
    - 질문 → 답변 패턴 감지
    - 제안 → 동의/반대 패턴 감지
    - @멘션 기반 대화 상대 식별

Step 4 — 맥락 종합
  - 의사결정 추출:
    - "확정", "결정", "합의", "agreed", "let's go with" 등 결정 시그널 탐색
    - 결정 주체(누가), 내용(무엇을), 동의자(누가 동의) 구조화
  - 최신 상태 판정:
    - 본문(Description)과 코멘트 내용이 상충 시 → 최신 코멘트 우선
    - 미해결 논의 감지 (질문 후 답변 없음, 반대 의견 후 합의 없음)
  - 참여자 프로필:
    - 코멘트 빈도 기반 역할 추론 (PO, 개발자, QA 등)

Step 5 — 구조화 & 반환
  - 결과 JSON 생성 (아래 스키마)
  - 호출자에게 반환 (캐싱 없음 — 이슈 내용은 수시로 변경됨)
```

**Output Schema:**

```json
{
  "key": "PROJ-123",
  "summary": "소셜 로그인으로 신규 가입",
  "type": "Story",
  "status": "In Progress",
  "assignee": "Bob",
  "reporter": "Alice",
  "created": "2026-03-20",
  "updated": "2026-04-03",
  "description_excerpt": "As a new user, I want to sign up via social accounts...",
  "comment_count": 7,
  "participants": [
    { "name": "Alice", "role_hint": "PO", "comment_count": 3 },
    { "name": "Bob", "role_hint": "BE Developer", "comment_count": 2 },
    { "name": "Charlie", "role_hint": "QA", "comment_count": 2 }
  ],
  "decisions": [
    {
      "date": "2026-04-01",
      "by": "Alice",
      "content": "OAuth scope을 email+profile로 한정",
      "agreed_by": ["Bob"],
      "source_comment_index": 3
    }
  ],
  "open_questions": [
    {
      "date": "2026-04-03",
      "by": "Charlie",
      "content": "Apple OAuth는 email이 optional인데 어떻게 처리?",
      "status": "unanswered"
    }
  ],
  "latest_context": "Bob이 4/3에 Apple OAuth는 scope 제한이 다르다고 지적. Charlie가 QA 관점에서 질문. 아직 미해결.",
  "conversation_summary": "Alice(PO)가 scope 제안 → Bob(BE) 동의 → Charlie(QA)가 Apple 특수 케이스 질문 (미답변)",
  "digest_found": true,
  "digest_covered_comments": "1-15",
  "new_comments_after_digest": 2
}
```

**캐싱 정책:**
- 이슈 내용은 **캐싱하지 않음** — 코멘트가 수시로 변경되므로 매 호출마다 Jira에서 조회
- digest 코멘트가 존재하면 Fast Path로 처리 비용 절감 (전체 파싱 불필요)
- 프로젝트 메타데이터(이슈 타입, 링크 타입 등)만 cache 스킬을 통해 캐싱 (거의 변경되지 않는 정보)

**에이전트에서의 사용 패턴:**
- imbas-analyst: Phase 1에서 기존 관련 이슈 참조 시
- imbas-planner: Phase 2에서 Epic이나 기존 Story 맥락 파악 시
- imbas-engineer: Phase 3에서 Story의 Jira 코멘트(추가 논의) 확인 시

---

### 6.2 imbas:cache — Jira 캐시 관리 (내부 전용)

```yaml
name: imbas-cache
user_invocable: false
description: >
  Internal skill. Manages Jira project metadata cache (issue types, link types,
  workflows). Auto-refreshes when TTL expires. Called by setup and core workflow skills.
complexity: simple
plugin: imbas
```

**호출 인터페이스:**
```
imbas:cache <action> [--project <KEY>]

<action>  : "ensure" | "refresh" | "clear"
--project : 프로젝트 참조 (없으면 config.defaults.project_ref)
```

| Action | 동작 |
|--------|------|
| `ensure` | TTL 내면 스킵, 만료면 자동 갱신 |
| `refresh` | 강제 갱신 |
| `clear` | 캐시 삭제 |

**사용자 접근 경로:** `/imbas:setup show` (캐시 상태 확인) / `/imbas:setup refresh-cache` (갱신)

---

### 6.3 imbas:digest — 이슈 컨텍스트 압축 (사용자 호출)

```yaml
name: imbas-digest
user_invocable: true
description: >
  Compresses a Jira issue's full context (description + comment thread + media)
  into a structured summary and posts it as a Jira comment. Uses State Tracking +
  QA-Prompting hybrid approach. Designed for ticket closing or pre-analysis compression.
  Trigger: "digest issue", "이슈 정리", "티켓 요약", "imbas digest"
complexity: moderate
plugin: imbas
```

**Arguments:**
```
/imbas:digest <issue-key> [--preview]

<issue-key>  : Jira 이슈 키 (e.g., PROJ-123)
--preview    : Jira에 코멘트 게시하지 않고 미리보기만
```

**Workflow:**

```
Step 1 — 이슈 읽기
  - read-issue(issue-key, depth: full) 호출
  - 첨부 미디어 감지 → 이미지/동영상 있으면 fetch-media 호출하여 시각 정보 포함

Step 2 — State Tracking (상태 추적)
  코멘트를 시간순으로 읽으며 상태 변화 기록:
  - t0: 이슈 등록 — 초기 요구사항
  - tN: 각 코멘트 — 상태 변경 감지 (결정/제약/질문/해결)
  결과: 상태 변화 타임라인

Step 3 — QA-Prompting (핵심 추출)
  6개 질문으로 추출 품질 검증:
  Q1: 어떤 결정이 내려졌는가?
  Q2: 왜 그렇게 결정했는가? (근거)
  Q3: 어떤 대안이 기각되었는가? (결과 + 사유만)
  Q4: 어떤 기술적 제약이 발견되었는가?
  Q5: 미해결된 문제가 있는가?
  Q6: 핵심 참여자와 역할은?

Step 4 — 압축본 생성 (3-Layer)
  Layer 3 (executive): 1-2문장 최종 요약
  Layer 2 (structured): decisions[], constraints[], rejected[], open_questions[]
  Layer 1 (excerpts): 결정 근거 원문 발췌 (최소한만)

Step 5 — 코멘트 포맷팅
  마커 포함 마크다운 코멘트 생성:

  <!-- imbas:digest v1 | generated: {timestamp} | comments_covered: 1-{N} -->
  ## imbas Digest

  ### Summary
  {Layer 3 executive summary}

  ### Decisions
  - {decision} (by {who}, {date}, agreed: {others})

  ### Constraints
  - {constraint description}

  ### Rejected
  - {alternative} 기각. 사유: {reason}

  ### Open Questions
  - {question} (by {who}, {date}) — {status}

  ### Participants
  - {name} ({role_hint}): {contribution summary}
  <!-- /imbas:digest -->

Step 6 — 게시
  - --preview → 사용자에게 미리보기 표시, 종료
  - 기본 → 사용자에게 미리보기 + "이 내용을 코멘트로 게시할까요?" 확인
  - 승인 → addCommentToJiraIssue로 게시
```

**digest 마커 규격:**
```
<!-- imbas:digest v{version} | generated: {ISO8601} | comments_covered: {start}-{end} -->
...
<!-- /imbas:digest -->
```
- `comments_covered`: digest가 분석한 코멘트 인덱스 범위
- read-issue가 이 마커를 감지하면 Fast Path 활성화
- 동일 이슈에 digest를 재실행하면 기존 digest 이후 코멘트만 추가 분석 → 신규 digest 코멘트 게시 (기존 것은 남겨둠)

**제안 트리거:**
- manifest가 transitionJiraIssue로 Done 전환 시
- 해당 이슈의 코멘트 >= 3개 AND 작성자 >= 2명
- 조건 충족 시: "이 티켓에 논의가 있었습니다. `/imbas:digest {key}` 로 정리할까요?"
- 자동 실행 아님 — 제안만

**교차 이슈 합성:**
- 현재 스코프 밖. digest는 단일 이슈 전용.
- 필요 시 별도 스킬로 추가 예정.

---

## 7. 스킬 간 호출 관계

```
사용자 (user_invocable: true — 8개)
  │
  ├── /imbas:setup ─────────── config.json + 캐시 초기화
  │         └── (내부) cache ensure
  │
  ├── /imbas:status ────────── 런 상태 조회
  │
  ├── /imbas:validate ─────── state.json 생성 → validation-report.md
  │         ├── (내부) cache ensure
  │         └── (내부) read-issue (관련 기존 이슈 참조 시)
  │
  ├── /imbas:split ────────── state.json 갱신 → stories-manifest.json
  │         ├── (내부) cache ensure
  │         ├── (내부) read-issue (Epic/기존 Story 맥락 파악 시)
  │         └── (안내) fetch-media (미디어 발견 시)
  │
  ├── /imbas:manifest stories ── stories-manifest → Jira Story 생성
  │
  ├── /imbas:devplan ──────── state.json 갱신 → devplan-manifest.json
  │         ├── (내부) cache ensure
  │         └── (내부) read-issue (Story 코멘트 추가 논의 확인)
  │
  ├── /imbas:manifest devplan ── devplan-manifest → Jira Subtask/Task 생성
  │         └── (제안) digest (Done 전환 시, 코멘트>=3 AND 작성자>=2)
  │
  ├── /imbas:fetch-media ──── 미디어 다운로드 + 분석
  │
  └── /imbas:digest ────────── 이슈 컨텍스트 압축 → Jira 코멘트 게시
            ├── (내부) read-issue → 코멘트 대화 맥락
            └── (내부) fetch-media → 첨부 미디어 분석 (있을 경우)

내부 전용 (user_invocable: false — 2개)
  ├── cache ─── setup, validate, split, devplan에서 자동 호출
  └── read-issue ─── validate, split, devplan, digest + 에이전트에서 호출
                      └── digest 코멘트 감지 시 Fast Path (커버된 범위 스킵)
```

---

## 8. 공통 설계 패턴

### 8.1 컨텍스트 절약

모든 스킬은 **slash command 직접 호출** 또는 **스킬/에이전트 내부 호출**로만 실행.
- 자동 트리거 없음 (불필요한 컨텍스트 점유 방지)
- 에이전트는 필요 시점에만 spawn → 결과 반환 → 즉시 종료

### 8.2 Plan-then-Execute

Phase 1-3은 **매니페스트만 생성** (읽기 전용).
실제 Jira 쓰기는 `imbas:manifest`에서만 수행.
→ 사용자가 항상 실행 전 검토 가능.

### 8.3 실패 복구

- 매니페스트의 status + issue_ref로 재실행 시 자동 스킵
- `skip_phases` action으로 특정 phase를 건너뛸 수 있음 (코드: `state.ts:112`, `state-manager.ts:106`)
- state.json으로 중단된 Phase 감지 → `imbas:status resume` 안내

### 8.4 단일 턴 실행

각 스킬은 `> EXECUTION MODEL: Single continuous operation` 원칙.
- 읽기 → 처리 → 에이전트 호출 → 결과 평가 → 상태 저장 → 사용자 리포트
- 사용자 결정이 필요한 시점에서만 턴 양보

---

## Related

- [SPEC-agents.md](./SPEC-agents.md) — 스킬이 호출하는 에이전트
- [SPEC-state.md](./SPEC-state.md) — 스킬이 읽고 쓰는 상태
- [SPEC-media.md](./SPEC-media.md) — fetch-media 상세
- [SPEC-atlassian-tools.md](./SPEC-atlassian-tools.md) — 사용하는 MCP 도구
- [BLUEPRINT.md](../BLUEPRINT.md) — 전체 아키텍처
.md](./SPEC-atlassian-tools.md) — 사용하는 MCP 도구
- [BLUEPRINT.md](../BLUEPRINT.md) — 전체 아키텍처
PEC-media.md) — fetch-media 상세
- [SPEC-atlassian-tools.md](./SPEC-atlassian-tools.md) — 사용하는 MCP 도구
- [BLUEPRINT.md](../BLUEPRINT.md) — 전체 아키텍처
.md](./SPEC-atlassian-tools.md) — 사용하는 MCP 도구
- [BLUEPRINT.md](../BLUEPRINT.md) — 전체 아키텍처
