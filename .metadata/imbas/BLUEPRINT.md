# imbas — Plugin Blueprint

> **이름**: imbas (imbas forosnai — 예언적 통찰)
> **소속**: ogham 하위 Claude Code 플러그인
> **Status**: Blueprint v1.2 (2026-07-10) — Implementation sync (3 providers, 12 skills, 16 tools)
> **설계 기반**: [design-v2.md](tirnanog:04_Action/npdp/imbas/design-v2.md), [imbas-spec-v1.md](tirnanog:04_Action/npdp/imbas/imbas-spec-v1.md)

---

## 1. What is imbas?

기획문서를 입력받아 **검증 → 분할 → 개발 티켓화**하는 Claude Code 플러그인.

```
기획 문서 (비정형)
  → [Phase 1: validate] 정합성 검증 → 리포트
  → [Phase 2: split] INVEST Story 분할 → Jira Story
  → [Phase 3: devplan] 코드 기반 Subtask/Task → Jira Subtask + Task
  → [manifest] 배치 실행 → Jira 이슈 생성
```

---

## 2. Architecture Overview

### 2.1 계층 구조

```
ogham (사전 가이드 시스템)
  └── imbas (이슈 분해 플러그인)
       ├── Skills (12개: user 10 + internal 2)
       │    ├── Core:  validate, split, devplan
       │    ├── Orchestration: pipeline (end-to-end 자동 실행)
       │    ├── Infra: setup, status
       │    ├── Exec:  manifest, digest
       │    ├── Post-planning: implement-plan (DAG 배치), scaffold-pr (Draft PR)
       │    └── Internal: `imbas:read-issue`, cache
       │
       ├── Agents (3개)
       │    ├── analyst   — 문서 정합성 검증 (sonnet, maxTurns 50)
       │    ├── planner   — Story 분할 (기획 관점; sonnet, maxTurns 60)
       │    └── engineer  — Subtask/Task 생성 (개발 관점; opus, maxTurns 80)
       │
       ├── Provider Abstraction
       │    ├── config.provider — "jira" | "github" | "local"
       │    ├── Jira Provider   — Atlassian MCP 도구 경유
       │    ├── GitHub Provider — gh CLI (Bash) 경유
       │    └── Local Provider  — .imbas/<KEY>/issues/ 마크다운 파일
       │
       ├── State (.imbas/)
       │    ├── config.json     — 글로벌 설정 (provider 포함)
       │    ├── <PROJECT>/cache — 이슈 트래커 메타데이터 캐시
       │    ├── <PROJECT>/runs  — 실행 기록 + 매니페스트
       │    └── .temp/          — 미디어 임시 파일
       │
       └── References
            ├── Agile 전문 지식 (에이전트 내장)
            ├── Issue search 패턴 (JQL / gh CLI)
            ├── Epic/Story/Subtask 템플릿
            └── EARS/INVEST/Given-When-Then 가이드
```

### 2.2 데이터 플로우

```
                        ┌─────────────────────────────────────────┐
                        │              .imbas/<PROJECT>/           │
                        │  config.json  │  cache/  │  runs/<id>/  │
                        └──────┬────────┴────┬─────┴──────┬───────┘
                               │             │            │
  ┌──────────┐    read    ┌────▼─────┐  read │     write  │
  │ 기획 문서 │───────────→│ validate │───────┤────────────┤
  └──────────┘            │ (analyst)│       │  report.md │
                          └────┬─────┘       │            │
                          PASS │             │            │
                          ┌────▼─────┐       │            │
                          │  split   │───────┤────────────┤
                          │(planner) │       │ stories.json│
                          │(analyst) │       │            │
                          └────┬─────┘       │            │
                       manifest│             │            │
                          ┌────▼─────┐       │            │
                          │ devplan  │───────┤────────────┤
                          │(engineer)│       │ devplan.json│
                          └────┬─────┘       │            │
                       manifest│             │            │
                          ┌────▼─────┐       │            │
                          │ manifest │───────┘            │
                          │ (exec)   │─── provider API ───┘
                          └──────────┘
```

---

## 3. Design Decisions

### 3.1 복수 에이전트 (3개)

| 결정                        | 근거                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **analyst + planner 분리**  | 검증(비판적 관점)과 분할(창조적 관점)은 상충하는 역할. 같은 에이전트가 자기 작업을 검증하면 편향 발생        |
| **planner + engineer 분리** | 문제 공간(사용자 가치)과 해법 공간(코드 구현)은 본질적으로 다른 전문성. Story에 코드 용어 침투 방지          |
| **media 별도 격리**         | 동영상 분석은 12~25장 프레임 이미지 로드 → 대량 컨텍스트 소비. 메인 에이전트 보호를 위해 서브에이전트로 격리 |
| **analyst 재사용**          | Phase 1(정합성 검증)과 Phase 2(역추론 검증)에서 동일 역할 → 에이전트 1개로 통합                              |

→ 상세: [SPEC-agents.md](./specs/SPEC-agents.md)

### 3.2 Plugin-MCP 상태머신: 불채택

| 결정                         | 근거                                                   |
| ---------------------------- | ------------------------------------------------------ |
| **파일 기반 상태 관리**      | 워크플로우가 선형(P1→P2→P3), 동시성 없음, 상태 경량    |
| **매니페스트 = 상태 저장소** | status + issue_ref 필드로 멱등성 + 장애 복구 완전 해결 |
| **추가 프로세스 불필요**     | MCP 서버 = 설치/유지 비용. 파일 I/O = zero-cost        |

### 3.3 Plan-then-Execute 패턴

| 결정                              | 근거                                              |
| --------------------------------- | ------------------------------------------------- |
| **Phase 1-3은 매니페스트만 생성** | Jira에 즉시 쓰지 않음. 사용자가 항상 실행 전 검토 |
| **manifest 스킬이 실제 생성**     | 쓰기 권한을 단일 스킬로 집중 → 감사/제어 용이     |
| **dry-run 지원**                  | 실행 계획 사전 확인 가능                          |

### 3.4 Issue Tracker Provider Abstraction

| 결정                         | 근거                                                                  |
| ---------------------------- | --------------------------------------------------------------------- |
| **Provider 추상화**          | Jira / GitHub Issues / local 마크다운 지원. `config.provider`로 선택  |
| **스킬 레벨 분기**           | 별도 MCP adapter 없이 스킬이 provider별 도구 직접 호출                |
| **Jira**: Atlassian MCP 도구 | 필수 12개 + 선택 3개                                                  |
| **GitHub**: gh CLI via Bash  | `gh issue`, `gh api`, `gh label` 등                                   |
| **Local**: 파일 시스템       | `.imbas/<KEY>/issues/{stories,tasks,subtasks}/` 마크다운              |
| **통일 매니페스트**          | `issue_ref` (Jira: `PROJ-123`, GitHub: `owner/repo#42`, Local: `S-1`) |

→ 상세: [SPEC-provider.md](./specs/SPEC-provider.md), [SPEC-provider-jira.md](./specs/SPEC-provider-jira.md), [SPEC-provider-github.md](./specs/SPEC-provider-github.md)

### 3.5 미디어 처리

| 결정                                | 근거                                                                                                                       |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **scene-sieve CLI 통합**            | `npx -y @lumy-pack/scene-sieve` — 설치 불필요, 자동 다운로드                                                               |
| **probe → extract → analyze 3단계** | probe로 최적 프리셋 결정 → extract로 키프레임 추출 → atlassian media 에이전트로 의미 분석 (migrated to `@ogham/atlassian`) |
| **서브에이전트 격리**               | 프레임 이미지(대용량)는 atlassian media 에이전트 컨텍스트에서만 로드. 메인 에이전트는 analysis.json 텍스트만 소비          |
| **프레임 경로 매핑**                | analysis.json에 frame path 포함 → 특정 장면의 원본 프레임 직접 확인 가능                                                   |

→ 상세: [SPEC-media.md](./specs/SPEC-media.md)

### 3.6 config.json 언어 설정

```json
{
  "language": {
    "documents": "ko", // 기획 문서, 검증 리포트
    "skills": "en", // 스킬/에이전트 파일 (항상 영어)
    "issue_content": "ko", // 이슈 title/description (provider-agnostic)
    "reports": "ko" // 매니페스트, 상태 리포트
  }
}
```

---

## 4. Skill Map

### User-invocable (사용자 노출, 10개)

| #      | Skill                   | Type          | Slash Command               | Agent                      | 입력                     | 출력                               |
| ------ | ----------------------- | ------------- | --------------------------- | -------------------------- | ------------------------ | ---------------------------------- |
| 1      | setup                   | Infra         | `/imbas:setup`              | —                          | 사용자 입력              | config.json, cache/, labels        |
| 2      | pipeline                | Orchestration | `/imbas:pipeline`           | analyst, planner, engineer | 문서 또는 Story 키       | 전체 파이프라인 자동 실행          |
| 3      | validate                | Core          | `/imbas:validate`           | analyst                    | 기획 문서                | validation-report.md               |
| 4      | split                   | Core          | `/imbas:split`              | planner, analyst           | 검증 통과 문서           | stories-manifest.json              |
| 5      | devplan                 | Core          | `/imbas:devplan`            | engineer                   | 승인된 Story + 코드      | devplan-manifest.json              |
| 6      | manifest                | Exec          | `/imbas:manifest`           | —                          | \*-manifest.json         | provider 이슈 (Jira/GitHub/local)  |
| 7      | implement-plan          | Post-planning | `/imbas:implement-plan`     | —                          | stories/devplan manifest | implement-plan.json + 리포트       |
| 8      | scaffold-pr             | Post-planning | `/imbas:scaffold-pr`        | —                          | 이슈 참조                | Draft PR (체크리스트 포함)         |
| 9      | status                  | Infra         | `/imbas:status`             | —                          | —                        | 상태 표시                          |
| 10     | digest                  | Exec          | `/imbas:digest`             | —                          | 이슈 참조                | provider 코멘트/엔트리 (압축 요약) |
| ~~11~~ | ~~`imbas:fetch-media`~~ | —             | `/atlassian:media-analysis` | —                          | —                        | _migrated to `@ogham/atlassian`_   |

### Internal (내부 전용, 2개)

| #   | Skill              | 호출자                                        | 역할                               | 출력          |
| --- | ------------------ | --------------------------------------------- | ---------------------------------- | ------------- |
| 11  | `imbas:read-issue` | validate, split, devplan, digest, scaffold-pr | 이슈 본문+코멘트 대화 맥락 구조화  | 구조화된 JSON |
| 12  | cache              | setup, core skills                            | provider 메타데이터 캐시 자동 갱신 | cache/\*.json |

→ 상세: [SPEC-skills.md](./specs/SPEC-skills.md)

**총 12개 스킬** (user-invocable 10 + internal 2).

---

## 5. Agent Map

| #     | Agent           | Model  | maxTurns | 역할                                              | 호출자                    |
| ----- | --------------- | ------ | -------- | ------------------------------------------------- | ------------------------- |
| 1     | analyst         | sonnet | 50       | 정합성 검증, 역추론                               | validate, split, pipeline |
| 2     | planner         | sonnet | 60       | Story 분할, INVEST 평가                           | split, pipeline           |
| 3     | engineer        | opus   | 80       | 코드 탐색, EARS Subtask, Task 추출                | devplan, pipeline         |
| ~~4~~ | ~~imbas-media~~ | —      | —        | _migrated to `@ogham/atlassian` as `media` agent_ | —                         |

에이전트 이름은 접두사 없는 bare name — plugin 네임스페이스가 `imbas:` 접두사를 제공하며,
스킬은 `subagent_type: "imbas:<agent>"` 형태로 spawn 한다.

→ 상세: [SPEC-agents.md](./specs/SPEC-agents.md)

---

## 6. .imbas/ Directory

```
.imbas/
├── config.json
├── .gitignore
├── <PROJECT-KEY>/            # GitHub ref "owner/repo" 는 "owner--repo" 디렉토리로 매핑
│   ├── cache/
│   │   ├── project-meta.json
│   │   ├── issue-types.json
│   │   ├── link-types.json
│   │   ├── workflows.json
│   │   └── cached_at.json
│   ├── issues/               # local provider 전용
│   │   ├── stories/          #   S-<N>.md
│   │   ├── tasks/            #   T-<N>.md
│   │   └── subtasks/         #   ST-<N>.md
│   └── runs/
│       └── <YYYYMMDD-NNN>/
│           ├── state.json
│           ├── source.md
│           ├── supplements/
│           ├── validation-report.md
│           ├── stories-manifest.json
│           ├── devplan-manifest.json
│           ├── implement-plan.json
│           └── implement-plan-report.md
└── .temp/
    └── <filename>/
        ├── frames/
        │   ├── frame_*.jpg
        │   └── .metadata.json
        └── analysis.json
```

---

## 7. Issue Architecture (Provider-Agnostic)

### 7.1 3계층 매핑

```
Epic (Level 1)
 ├── Story A ──is blocked by──→ Task T1
 │    ├── Subtask A-1 (EARS)
 │    └── Subtask A-2 (EARS)
 ├── Story B ──is blocked by──→ Task T1
 │    └── Subtask B-1 (EARS)
 └── Task T1 (공통 기술 작업)
      ├── Subtask T1-1 (EARS)
      └── Subtask T1-2 (EARS)
```

| 계층       | Jira                        | GitHub                                          | Local                               |
| ---------- | --------------------------- | ----------------------------------------------- | ----------------------------------- |
| Epic       | Epic 이슈 타입 (네이티브)   | Tracking Issue + `type:epic` label              | (미지원 — Story 계층부터)           |
| Story/Task | Story/Task 타입 (네이티브)  | Issue + `type:story`/`type:task` label          | `S-<N>.md` / `T-<N>.md` frontmatter |
| Subtask    | Sub-task 타입 (parent 필드) | Issue + `type:subtask` label + parent task list | `ST-<N>.md` (frontmatter parent)    |
| Link       | 네이티브 Issue Link         | `## Links` body section (양방향 기록)           | frontmatter links[] (양방향)        |
| 상태       | Workflow 전이               | Label swap (`status:*`) + open/closed           | frontmatter status                  |

### 7.2 링크 타입

| Link                           | 용도                                             | 생성 시점 |
| ------------------------------ | ------------------------------------------------ | --------- |
| `blocks` / `is blocked by`     | Story ↔ Task 실행 순서                           | Phase 3   |
| `is split into` / `split from` | 수평 분할 추적 (크기 초과 → 원본 Done)           | Phase 2   |
| `relates to`                   | umbrella Story ↔ 하위 Story 연결 (개념적 그룹핑) | Phase 2   |

### 7.3 워크플로우 상태

| 시점                   | 상태            |
| ---------------------- | --------------- |
| imbas가 이슈 생성      | `To Do`         |
| 수평 분할된 원본 Story | `Done`          |
| 사용자 명시적 허가 후  | `Ready for Dev` |

---

## 8. Key Principles

1. **원본 불변** — 원본 문서는 읽기 전용
2. **점진적 분할** — 논리적 비약 없이 한 스텝씩
3. **앵커 체인 + 원본 참조** — 직전 상위를 주 앵커로 삼되, 도메인 컨텍스트 유실 방지를 위해 원본(source.md)을 읽기 전용으로 병행 참조
4. **탈출은 리포트** — 멈출 때는 이유와 필요사항을 구조화 (Phase 3의 Blocked Report 등)
5. **병렬 가능** — 하나가 막혀도 나머지는 진행
6. **결함 노출 구조** — 무결 보장이 아닌, 결함이 숨을 수 없는 구조
7. **LLM이 판단, 코드가 검증** — 불일치 시 인간에게 에스컬레이션
8. **Testability Quality Gate** — Phase 1에서 명확하고 테스트 가능한 인수 조건(BDD/AC 등) 부재 시 반려
9. **State Drift Reconciliation** — 매니페스트 기반 상태 관리 시 원격 상태와의 괴리 감지 및 동기화

---

## Spec Documents

| Doc                                                            | 내용                                                                     |
| -------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [SPEC-agents.md](./specs/SPEC-agents.md)                       | 에이전트 3개 정의, reference material, 도구, 호출 관계                   |
| [SPEC-skills.md](./specs/SPEC-skills.md)                       | 스킬 12개 정의 (user 10 + internal 2), 인터페이스, 워크플로우, 호출 관계 |
| [SPEC-tools.md](./specs/SPEC-tools.md)                         | imbas MCP tools 서버 16개 도구 정의, AST 분석, fallback 스킬             |
| [SPEC-media.md](./specs/SPEC-media.md)                         | 미디어 다운로드, scene-sieve 통합, 서브에이전트 격리                     |
| [SPEC-provider.md](./specs/SPEC-provider.md)                   | Provider 추상화 인터페이스, 통일 타입, 분기 패턴                         |
| [SPEC-provider-jira.md](./specs/SPEC-provider-jira.md)         | Jira provider — Atlassian MCP 도구, 실행 패턴, 접근 제어                 |
| [SPEC-provider-github.md](./specs/SPEC-provider-github.md)     | GitHub provider — gh CLI 패턴, 라벨, `## Links` body section             |
| [SPEC-provider-local.md](./specs/SPEC-provider-local.md)       | Local provider — 마크다운 파일 저장, ID 규칙, 양방향 링크                |
| ~~[SPEC-atlassian-tools.md](./specs/SPEC-atlassian-tools.md)~~ | ~~Deprecated — SPEC-provider-jira.md로 대체~~                            |
