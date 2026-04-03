# imbas — Plugin Blueprint

> **이름**: imbas (imbas forosnai — 예언적 통찰)
> **소속**: ogham 하위 Claude Code 플러그인
> **Status**: Blueprint v1.0 (2026-04-04)
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
       ├── Skills (8개)
       │    ├── Core:  validate, split, devplan
       │    ├── Infra: setup, cache, status
       │    ├── Exec:  manifest
       │    └── Util:  fetch-media
       │
       ├── Agents (4개)
       │    ├── imbas-analyst   — 문서 정합성 검증
       │    ├── imbas-planner   — Story 분할 (기획 관점)
       │    ├── imbas-engineer  — Subtask/Task 생성 (개발 관점)
       │    └── imbas-media     — 미디어 키프레임 분석
       │
       ├── State (.imbas/)
       │    ├── config.json     — 글로벌 설정
       │    ├── <PROJECT>/cache — Jira 메타데이터 캐시
       │    ├── <PROJECT>/runs  — 실행 기록 + 매니페스트
       │    └── .temp/          — 미디어 임시 파일
       │
       └── References
            ├── Jira/Agile 전문 지식 (에이전트 내장)
            ├── JQL 패턴
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
                          │ (exec)   │──── Jira API ──────┘
                          └──────────┘
```

---

## 3. Design Decisions

### 3.1 복수 에이전트 (4개)

| 결정 | 근거 |
|------|------|
| **analyst + planner 분리** | 검증(비판적 관점)과 분할(창조적 관점)은 상충하는 역할. 같은 에이전트가 자기 작업을 검증하면 편향 발생 |
| **planner + engineer 분리** | 문제 공간(사용자 가치)과 해법 공간(코드 구현)은 본질적으로 다른 전문성. Story에 코드 용어 침투 방지 |
| **media 별도 격리** | 동영상 분석은 12~25장 프레임 이미지 로드 → 대량 컨텍스트 소비. 메인 에이전트 보호를 위해 서브에이전트로 격리 |
| **analyst 재사용** | Phase 1(정합성 검증)과 Phase 2(역추론 검증)에서 동일 역할 → 에이전트 1개로 통합 |

→ 상세: [SPEC-agents.md](./specs/SPEC-agents.md)

### 3.2 Plugin-MCP 상태머신: 불채택

| 결정 | 근거 |
|------|------|
| **파일 기반 상태 관리** | 워크플로우가 선형(P1→P2→P3), 동시성 없음, 상태 경량 |
| **매니페스트 = 상태 저장소** | status + jira_key 필드로 멱등성 + 장애 복구 완전 해결 |
| **추가 프로세스 불필요** | MCP 서버 = 설치/유지 비용. 파일 I/O = zero-cost |

→ 상세: [SPEC-state.md](./specs/SPEC-state.md)

### 3.3 Plan-then-Execute 패턴

| 결정 | 근거 |
|------|------|
| **Phase 1-3은 매니페스트만 생성** | Jira에 즉시 쓰지 않음. 사용자가 항상 실행 전 검토 |
| **manifest 스킬이 실제 생성** | 쓰기 권한을 단일 스킬로 집중 → 감사/제어 용이 |
| **dry-run 지원** | 실행 계획 사전 확인 가능 |

### 3.4 Atlassian MCP 도구 선별

- **필수 12개**: Jira CRUD + 링크 + 전환 + 캐시용 메타데이터
- **선택 3개**: Confluence 읽기 + fetchAtlassian (미디어 다운로드)
- **제외 15개**: Confluence 쓰기, 사용자 조회, 워크로그 등
- **기존 Skill 5개 중 0개 직접 포함**: spec-to-backlog은 imbas가 대체, 나머지는 범위 밖. 참조 자료(템플릿, JQL 패턴)만 흡수.

→ 상세: [SPEC-atlassian-tools.md](./specs/SPEC-atlassian-tools.md)

### 3.5 미디어 처리

| 결정 | 근거 |
|------|------|
| **scene-sieve CLI 통합** | `npx -y @lumy-pack/scene-sieve` — 설치 불필요, 자동 다운로드 |
| **probe → extract → analyze 3단계** | probe로 최적 프리셋 결정 → extract로 키프레임 추출 → imbas-media로 의미 분석 |
| **서브에이전트 격리** | 프레임 이미지(대용량)는 imbas-media 컨텍스트에서만 로드. 메인 에이전트는 analysis.json 텍스트만 소비 |
| **프레임 경로 매핑** | analysis.json에 frame path 포함 → 특정 장면의 원본 프레임 직접 확인 가능 |

→ 상세: [SPEC-media.md](./specs/SPEC-media.md)

### 3.6 config.json 언어 설정

```json
{
  "language": {
    "documents": "ko",      // 기획 문서, 검증 리포트
    "skills": "en",          // 스킬/에이전트 파일 (항상 영어)
    "jira_content": "ko",    // Jira 이슈 title/description
    "reports": "ko"          // 매니페스트, 상태 리포트
  }
}
```

→ 상세: [SPEC-state.md](./specs/SPEC-state.md)

---

## 4. Skill Map

| # | Skill | Type | Slash Command | Agent | 입력 | 출력 |
|---|-------|------|--------------|-------|------|------|
| 1 | validate | Core | `/imbas:validate` | imbas-analyst | 기획 문서 | validation-report.md |
| 2 | split | Core | `/imbas:split` | imbas-planner, imbas-analyst | 검증 통과 문서 | stories-manifest.json |
| 3 | devplan | Core | `/imbas:devplan` | imbas-engineer | 승인된 Story + 코드 | devplan-manifest.json |
| 4 | setup | Infra | `/imbas:setup` | — | 사용자 입력 | config.json, cache/ |
| 5 | cache | Infra | `/imbas:cache` | — | — | cache/ 갱신 |
| 6 | status | Infra | `/imbas:status` | — | — | 상태 표시 |
| 7 | manifest | Exec | `/imbas:manifest` | — | *-manifest.json | Jira 이슈 |
| 8 | fetch-media | Util | `/imbas:fetch-media` | imbas-media | URL/경로 | analysis.json |

→ 상세: [SPEC-skills.md](./specs/SPEC-skills.md)

---

## 5. Agent Map

| # | Agent | Model | 역할 | 호출자 |
|---|-------|-------|------|--------|
| 1 | imbas-analyst | sonnet | 정합성 검증, 역추론 | validate, split |
| 2 | imbas-planner | sonnet | Story 분할, INVEST 평가 | split |
| 3 | imbas-engineer | opus | 코드 탐색, EARS Subtask, Task 추출 | devplan |
| 4 | imbas-media | sonnet | 키프레임 의미 분석 | fetch-media |

→ 상세: [SPEC-agents.md](./specs/SPEC-agents.md)

---

## 6. .imbas/ Directory

```
.imbas/
├── config.json
├── .gitignore
├── <PROJECT-KEY>/
│   ├── cache/
│   │   ├── project-meta.json
│   │   ├── issue-types.json
│   │   ├── link-types.json
│   │   ├── workflows.json
│   │   └── cached_at.json
│   └── runs/
│       └── <YYYYMMDD-NNN>/
│           ├── state.json
│           ├── source.md
│           ├── supplements/
│           ├── validation-report.md
│           ├── stories-manifest.json
│           └── devplan-manifest.json
└── .temp/
    └── <filename>/
        ├── frames/
        │   ├── frame_*.jpg
        │   └── .metadata.json
        └── analysis.json
```

→ 상세: [SPEC-state.md](./specs/SPEC-state.md)

---

## 7. Jira Issue Architecture

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

### 7.2 링크 타입

| Link | 용도 | 생성 시점 |
|------|------|----------|
| `blocks` / `is blocked by` | Story ↔ Task 실행 순서 | Phase 3 |
| `is split into` / `split from` | 수평 분할 추적 | Phase 2 |

### 7.3 워크플로우 상태

| 시점 | 상태 |
|------|------|
| imbas가 이슈 생성 | `To Do` |
| 수평 분할된 원본 Story | `Done` |
| 사용자 명시적 허가 후 | `Ready for Dev` |

---

## 8. Key Principles

1. **원본 불변** — 원본 문서는 읽기 전용
2. **점진적 분할** — 논리적 비약 없이 한 스텝씩
3. **앵커 체인** — 검증된 직전 상위만 참조
4. **탈출은 리포트** — 멈출 때는 이유와 필요사항을 구조화
5. **병렬 가능** — 하나가 막혀도 나머지는 진행
6. **결함 노출 구조** — 무결 보장이 아닌, 결함이 숨을 수 없는 구조
7. **LLM이 판단, 코드가 검증** — 불일치 시 인간에게 에스컬레이션

---

## Spec Documents

| Doc | 내용 |
|-----|------|
| [SPEC-agents.md](./specs/SPEC-agents.md) | 에이전트 4개 정의, reference material, 도구, 호출 관계 |
| [SPEC-skills.md](./specs/SPEC-skills.md) | 스킬 8개 정의, 인터페이스, 워크플로우, 호출 관계 |
| [SPEC-state.md](./specs/SPEC-state.md) | .imbas/ 구조, config.json, state.json, manifest 스키마 |
| [SPEC-media.md](./specs/SPEC-media.md) | 미디어 다운로드, scene-sieve 통합, 서브에이전트 격리 |
| [SPEC-atlassian-tools.md](./specs/SPEC-atlassian-tools.md) | Atlassian MCP 도구 검토 (필수/선택/제외) |

## Implementation Plan

→ [PLAN.md](./PLAN.md)
