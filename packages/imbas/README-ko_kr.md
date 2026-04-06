# @ogham/imbas

제품 기획 문서를 구조화된 Jira 개발 태스크로 변환하는 Claude Code 플러그인입니다.

기획서를 쓰는 건 쉽습니다. 하지만 그걸 의존성, 크기 추정, 실제 구현 근거가 갖춰진 Story/Task/Subtask 백로그로 만드는 건 지루하고 실수가 잦은 작업입니다. imbas는 이 과정을 전문 AI 에이전트가 구동하는 **3단계 파이프라인**으로 자동화합니다.

---

## 설치

### Marketplace를 통한 설치 (권장)

```bash
# 1. Marketplace에 저장소 등록
claude plugin marketplace add https://github.com/vincent-kk/ogham

# 2. 플러그인 설치
claude plugin install imbas
```

설치 후 별도 설정 없이 모든 컴포넌트(Skills, MCP, Agents, Hooks)가 자동 등록됩니다.

### 개발자용 로컬 설치

```bash
# 모노레포 루트에서
yarn install

# 플러그인 빌드
cd packages/imbas
yarn build          # TypeScript 컴파일 + 번들링

# Claude Code에서 플러그인 로드
claude --plugin-dir ./packages/imbas
```

빌드하면 두 가지 산출물이 생성됩니다:

- `bridge/mcp-server.cjs` — MCP 서버 (파이프라인 도구 15개)
- `bridge/*.mjs` — Hook 스크립트 5개 (자동 생명주기 관리)

---

## 아이디어

제품팀이 기획서를 쓰고, 개발팀이 티켓으로 분해합니다. 이 인수인계 과정에서 맥락이 유실됩니다 — 요구사항이 잘못 해석되고, 엣지 케이스가 누락되고, 의존성이 꼬입니다.

imbas는 기획서와 백로그 사이에 위치합니다. 기획 문서를 읽고, 모순과 빈틈을 검증하고, 인수 기준이 포함된 Story로 분해한 뒤, 실제 코드베이스를 분석하여 구현 가능한 Task와 Subtask를 생성합니다.

핵심 통찰: **Story 분해는 제품 관점의 작업이고, Task 계획은 엔지니어링 관점의 작업입니다.** imbas는 각각에 별도의 전문 에이전트를 사용하므로, 제품 로직과 구현 로직이 서로 오염되지 않습니다.

---

## 동작 원리

### 3단계 파이프라인

```
문서 → [Validate] → [Split] → [Devplan] → Jira 이슈
           ↓            ↓          ↓
      Report.md   Stories.json  Devplan.json
```

**Phase 1 — Validate (검증):** `imbas-analyst` 에이전트가 기획서를 읽고 모순, 섹션 간 불일치, 누락된 요구사항, 논리적 불가능성을 검출합니다. 검증 보고서를 생성하며, 차단 이슈가 발견되면 파이프라인이 여기서 중단됩니다 — 기획서를 먼저 수정해야 합니다.

**Phase 2 — Split (분할):** `imbas-planner` 에이전트가 검증된 문서를 INVEST 기준을 충족하는 Jira Story로 분해합니다. 각 Story에는:
- User Story 구문 ("As a... I want... So that...")
- Given/When/Then 인수 기준
- 3단계 검증: 원본 앵커 링크 → 일관성 검사 → 역추론(Story만으로 원래 요구사항을 재구성할 수 있는가?)
- 크기 검사 — 너무 큰 Story는 수평 분할

**Phase 3 — Devplan (개발 계획):** `imbas-engineer` 에이전트가 Story를 받아 로컬 코드베이스를 탐색(AST 분석)하여 생성합니다:
- Story별 EARS 형식 Subtask (최대 200줄 / 10파일 / 1시간 리뷰 범위)
- Story 간 공유 Task (N:M 병합점 감지로 추출)
- 의존성 링크와 실행 순서
- Story의 모호한 부분에 대한 피드백 코멘트 (제품팀 확인 필요)

각 단계는 매니페스트 파일에 결과를 기록합니다. 매니페스트는 이후 Jira에 일괄 실행되어 이슈, 링크, 코멘트를 생성합니다.

### 상태 머신

모든 실행은 상태 머신(`state.json`)으로 추적되며, 엄격한 전환 규칙이 적용됩니다:

- `imbas:validate` → 항상 시작 가능
- `imbas:split` → validate가 통과(PASS 또는 PASS_WITH_WARNINGS)한 후에만
- `imbas:devplan` → split이 완료되고 Story 리뷰가 끝난 후에만

각 단계는 escape(사유 코드와 함께 비정상 종료)하거나 skip할 수 있습니다. 파이프라인은 재개가 가능합니다 — 중단된 경우 `imbas:status resume`로 이어서 진행합니다.

### 작업 디렉토리

모든 상태는 `.imbas/`에 로컬 저장됩니다:

```
.imbas/
├── config.json                 # 전역 설정 (언어, LLM 모델, Jira 설정)
├── <PROJECT_KEY>/
│   ├── cache/                  # 캐시된 Jira 메타데이터 (24시간 TTL)
│   │   ├── project-meta.json
│   │   ├── issue-types.json
│   │   ├── link-types.json
│   │   └── workflows.json
│   └── runs/
│       └── 20250404-001/       # Run ID: YYYYMMDD-NNN
│           ├── state.json      # 단계 상태 머신
│           ├── source.md       # 입력 문서
│           ├── supplements/    # 보조 파일 (선택)
│           ├── validation-report.md
│           ├── stories-manifest.json
│           └── devplan-manifest.json
└── .temp/                      # 미디어 분석 작업 디렉토리
```

---

## 사용법

imbas 스킬은 **LLM 프롬프트**이지, CLI 명령어가 아닙니다. Claude Code 안에서 자연어로 대화하듯 호출합니다.

### 초기 설정

```
/imbas:imbas-setup
/imbas:imbas-setup --project PROJ
```

`.imbas/` 디렉토리를 생성하고, `config.json`을 설정하고, Jira 프로젝트 메타데이터(이슈 타입, 링크 타입, 워크플로)를 캐싱합니다.

### 전체 파이프라인 실행

```
/imbas:imbas-pipeline ./spec.md
/imbas:imbas-pipeline ./spec.md --project PROJ
```

validate → split → manifest-stories → devplan → manifest-devplan을 품질 게이트 자동 승인과 함께 일괄 실행합니다. 대부분의 사용자에게 주요 진입점입니다.

### 단계별 개별 실행

더 세밀한 제어가 필요할 때:

```
# Phase 1: 문서 검증
/imbas:imbas-validate

# Phase 2: Story 분할
/imbas:imbas-split

# Phase 3: 개발 계획 생성
/imbas:imbas-devplan
```

각 단계는 이전 단계의 출력을 읽어 자체 매니페스트를 작성합니다.

### 매니페스트를 Jira에 실행

```
/imbas:imbas-manifest stories     # Story 이슈 생성
/imbas:imbas-manifest devplan     # Task, Subtask, 링크 생성
/imbas:imbas-manifest stories --dry-run   # 생성 없이 미리보기
```

매니페스트 실행은 멱등성을 보장합니다 — 재실행 시 이미 생성된 이슈(매니페스트의 `issue_ref`로 추적)는 건너뜁니다.

### 파이프라인 상태 확인

```
/imbas:imbas-status              # 현재 실행 상태
/imbas:imbas-status list         # 프로젝트의 전체 실행 목록
/imbas:imbas-status resume       # 중단된 실행 재개
```

### 추가 도구

```
# Jira 이슈를 구조화된 요약 코멘트로 압축
/imbas:imbas-digest PROJ-123

# 미디어 첨부파일 분석 (이미지, 동영상, GIF)
/imbas:imbas-fetch-media <url-or-path>
```

---

## 에이전트

imbas는 역할이 제한된 4개의 전문 서브에이전트를 사용합니다:

| 에이전트 | 모델 | 역할 | 단계 |
|----------|------|------|------|
| `imbas-analyst` | Sonnet | 문서 검증 (모순, 빈틈, 불가능성 검출) | Validate, Split (역추론) |
| `imbas-planner` | Sonnet | Story 분해 (INVEST 기준, 인수 기준) | Split |
| `imbas-engineer` | Opus | Task 계획 (코드베이스 탐색, Subtask 생성) | Devplan |
| `imbas-media` | Sonnet | 미디어 분석 (키프레임 추출, 시각적 설명) | Fetch-media |

에이전트 역할은 `SubagentStart` Hook을 통해 런타임에 시행됩니다 — 에이전트는 할당된 책임을 넘어설 수 없습니다.

---

## 자동으로 동작하는 것들

플러그인이 활성화되면 아래 Hook들이 **사용자 개입 없이** 자동 실행됩니다:

| 언제 | 무엇을 | 왜 |
|------|--------|-----|
| 세션 시작 시 | 캐시 디렉토리 + 로깅 초기화 | `.imbas/` 구조 보장 |
| 파일 Read/Write/Edit 시 | 도구 입력 검증 | `.imbas/` 상태 파일에 대한 잘못된 조작 방지 |
| 서브에이전트 시작 시 | 역할 제한 주입 | 에이전트가 할당된 단계를 넘어서는 것 방지 |
| 사용자 프롬프트 입력 시 | 실행/매니페스트 컨텍스트 주입 | 에이전트가 현재 파이프라인 상태를 인지 |
| 세션 종료 시 | 플레이스홀더 (자동 정리 없음) | `.imbas/.temp/` 유지됨; 필요 시 수동 정리 |

---

## 전체 스킬 목록

| 스킬 | 사용자 호출 | 설명 |
|------|------------|------|
| `/imbas:imbas-setup` | Yes | `.imbas/` 초기화, 프로젝트 및 Jira 설정 |
| `/imbas:imbas-pipeline` | Yes | 자동 승인 게이트 포함 전체 파이프라인 실행 |
| `/imbas:imbas-validate` | Yes | Phase 1: 문서의 모순과 빈틈 검증 |
| `/imbas:imbas-split` | Yes | Phase 2: 문서를 INVEST Story로 분해 |
| `/imbas:imbas-devplan` | Yes | Phase 3: 코드베이스 기반 Task/Subtask 생성 |
| `/imbas:imbas-manifest` | Yes | 매니페스트를 Jira에 일괄 실행 |
| `/imbas:imbas-status` | Yes | 실행 상태 확인, 목록, 중단된 실행 재개 |
| `/imbas:imbas-digest` | Yes | Jira 이슈를 구조화된 요약으로 압축 |
| `/imbas:imbas-fetch-media` | Yes | 미디어 첨부파일 다운로드 및 분석 |
| `/imbas:imbas-cache` | No | 내부: Jira 메타데이터 캐시 관리 (24시간 TTL) |
| `/imbas:imbas-read-issue` | No | 내부: Jira 이슈 컨텍스트 읽기 및 구조화 |

---

## 기대 결과

### 입력

무엇을 만들지 기술한 기획 문서 (Markdown, Confluence 페이지, 또는 Jira 에픽 설명) — 기능, 사용자 흐름, 요구사항, 제약 조건.

### 출력

완전히 구조화된 Jira 백로그:

- **Story** — User Story 구문, Given/When/Then 인수 기준, 검증 메타데이터 포함
- **Task** — 여러 Story에서 추출된 공통 관심사
- **Subtask** — 구현 가능한 단위로 범위 제한 (≤200줄, ≤10파일, ≤1시간 리뷰)
- **Link** — 의존성 인코딩 (blocks, split-into, relates-to)
- **실행 순서** — 올바른 순서로 이슈를 생성하기 위한 번호 매겨진 단계
- **피드백 코멘트** — 제품팀 확인이 필요한 모호한 부분 표시

### 검출 항목

검증(Validate) 단계에서:
- **모순(Contradiction)** — A 섹션은 X라고 하는데 B 섹션은 not-X
- **불일치(Divergence)** — 섹션 간 용어나 범위가 어긋남
- **누락(Omission)** — 참조는 있지만 명세가 없는 기능/흐름
- **불가능(Infeasibility)** — 기술적 제약과 충돌하는 요구사항

분할(Split) 단계에서:
- **기능적 완결성 위반** — E2E 레벨에서 독립적으로 테스트할 수 없거나, 테스트 가능성이 없는 Story
- **의미 손실** — 역추론으로 분해 과정에서 누락된 요구사항이 없는지 검증

개발 계획(Devplan) 단계에서:
- **구현 경로 부재** — 기존 코드 패턴에 매핑할 수 없는 Story
- **Story 간 중복** — Subtask에 중복되기보다 단일 Task로 추출해야 할 공유 로직

---

## 설정

`config.json` 구성:

```jsonc
{
  "language": {
    "documents": "ko",           // 원본 문서 언어
    "skills": "en",              // 에이전트 프롬프트 언어
    "issue_content": "ko",       // Jira 이슈 내용 언어
    "reports": "ko"              // 보고서 출력 언어
  },
  "defaults": {
    "project_ref": "PROJ",       // 기본 Jira 프로젝트
    "llm_model": {
      "validate": "sonnet",      // 단계별 모델 지정
      "split": "sonnet",
      "devplan": "opus"
    },
    "subtask_limits": {
      "max_lines": 200,          // Subtask당 최대 줄 수
      "max_files": 10,           // Subtask당 최대 파일 수
      "review_hours": 1          // Subtask당 최대 리뷰 시간
    }
  }
}
```

변경 방법:

```
/imbas:imbas-setup set-language documents=en
/imbas:imbas-setup set-project NEWPROJ
```

---

## 개발

```bash
yarn dev            # TypeScript watch 모드
yarn test           # Vitest watch
yarn test:run       # 1회 실행
yarn typecheck      # 타입 체크
yarn build          # tsc + MCP 서버 + hooks 번들링
```

### 기술 스택

TypeScript 5.7, @modelcontextprotocol/sdk, @ast-grep/napi, esbuild, Vitest, Zod

[English documentation (README.md)](./README.md) is also available.

---

## License

MIT

TypeScript 5.7, @modelcontextprotocol/sdk, @ast-grep/napi, esbuild, Vitest, Zod

[English documentation (README.md)](./README.md) is also available.

---

## License

MIT
