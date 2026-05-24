# Ogham

[![TypeScript](https://img.shields.io/badge/typescript-✔-blue.svg)]()
[![Claude Code](https://img.shields.io/badge/claude--code-plugin-purple.svg)]()
[![Node.js](https://img.shields.io/badge/node.js-20+-green.svg)]()

---

## 개요

**Ogham**은 Claude Code 플러그인과 AI 기반 개발자 도구를 위한 모노레포입니다. 모든 패키지는 TypeScript로 작성되어 있으며, Claude Code 에이전트 동작을 확장하는 6개의 플러그인을 제공합니다 — 프로젝트 구조 자동 관리부터 개인 지식 그래프, Atlassian 통합, 다중 모델 위임, 기획 파이프라인까지.

---

## 빠른 시작 — Marketplace 설치

Ogham 플러그인을 사용하는 가장 간단한 방법은 Claude Code 플러그인 마켓플레이스를 통한 설치입니다.

```bash
# 1. 이 저장소를 마켓플레이스 소스로 등록
claude plugin marketplace add https://github.com/vincent-kk/ogham

# 2. 플러그인 설치 (아래 6개 중 어떤 것이든)
claude plugin install filid
claude plugin install maencof
```

이것으로 끝입니다. 모든 컴포넌트(Skills, MCP 도구, Agents, Hooks)가 자동으로 등록되며 별도 설정이 필요 없습니다.

> 설치 후 Claude Code에서 바로 스킬을 사용할 수 있습니다. 예를 들어 `/filid:filid-setup`을 입력하면 프로젝트에 FCA-AI를 초기화합니다. 사용 가능한 모든 플러그인은 아래 [전체 패키지 목록](#전체-패키지-목록) 표에서 확인하세요.

---

## 플러그인

### [`@ogham/filid`](./packages/filid/) — FCA-AI 규칙 시행

**Fractal Context Architecture (FCA-AI)** 기반으로 프로젝트 구조와 문서를 자동으로 관리하는 Claude Code 플러그인입니다.

코드베이스가 커지면 AI 에이전트가 맥락을 잃고, 문서는 코드와 어긋나고, 디렉토리 구조는 일관성을 잃습니다. filid는 자동화된 규칙 시행으로 이 문제를 해결합니다.

**제공 컴포넌트:**

| 컴포넌트 | 수량     | 예시                                                                                      |
| -------- | -------- | ----------------------------------------------------------------------------------------- |
| Skills   | 18       | `/filid:filid-setup`, `/filid:filid-review`, `/filid:filid-scan`, `/filid:filid-pipeline` |
| MCP 도구 | 18       | 구조 분석, 드리프트 감지, AST 메트릭, 기술 부채 추적                                      |
| Agents   | 14       | Architect, Implementer, QA Reviewer, 7인 페르소나 리뷰 위원회                             |
| Hooks    | 5 events | SessionStart, PreToolUse, SubagentStart, UserPromptSubmit, SessionEnd                     |

**주요 기능:**

- **다중 페르소나 합의 리뷰** — 7인 페르소나 위원회(architect, knowledge manager, SRE, business driver, product manager, design/HCI, adjudicator)가 PR 변경사항에 대해 합의를 도출합니다
- **자동 규칙 시행** — INTENT.md 50줄 제한, 3-Tier 경계 섹션 검증, organ 디렉토리 보호, 네이밍 컨벤션 검사
- **구조적 드리프트 감지** — 코드 변경이 문서화된 구조를 벗어나면 DAG 분석으로 감지하고 자동 동기화
- **AST 기반 분석** — `@ast-grep/napi`로 모듈 응집도(LCOM4), 순환 복잡도, 순환 의존성 검출
- **End-to-end 파이프라인** — `filid-pipeline`이 PR 생성 → 다중 페르소나 리뷰 → 리졸브 → 재검증을 연결

```
# 프로젝트에 FCA-AI 초기화
/filid:filid-setup

# 규칙 위반 스캔
/filid:filid-scan

# 현재 브랜치에 대해 다중 페르소나 코드 리뷰 실행
/filid:filid-review

# 전체 PR 파이프라인 실행 (review → resolve → revalidate)
/filid:filid-pipeline
```

자세한 문서는 [filid README (영문)](./packages/filid/README.md) 또는 [filid README (한글)](./packages/filid/README-ko_kr.md)을 참조하세요.

### [`@ogham/maencof`](./packages/maencof/) — 개인 지식 공간 관리자

**마크다운 기반 Knowledge Graph**와 **Spreading Activation** 검색으로 개인 지식을 관리하는 Claude Code 플러그인입니다.

AI 에이전트는 세션 간에 사용자를 잊습니다. 메모는 여러 도구에 흩어지고, 인사이트는 사라지며, 매번 대화가 처음부터 시작됩니다. maencof는 사용자가 소유하는 순수 마크다운 파일 위에 구축된 5계층 지식 모델로 이 문제를 해결합니다.

**제공 컴포넌트:**

| 컴포넌트 | 수량        | 예시                                                                                                          |
| -------- | ----------- | ------------------------------------------------------------------------------------------------------------- |
| Skills   | 26          | `/maencof:maencof-setup`, `/maencof:maencof-remember`, `/maencof:maencof-recall`, `/maencof:maencof-organize` |
| MCP 도구 | 18          | 지식 CRUD, 그래프 검색, 스프레딩 액티베이션, 인사이트 캡처                                                    |
| Agents   | 5           | Memory Organizer, Identity Guardian, Checkup, Configurator, Knowledge Connector                               |
| Hooks    | multi-event | SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop, SessionEnd                                     |

**주요 기능:**

- **5계층 지식 모델 v2** — `01_Core`(정체성, 읽기 전용) → `02_Derived`(내재화) → `03_External`(relational / structural / topical 서브레이어) → `04_Action`(휘발성 작업 메모리) → `05_Context`(buffer / boundary)
- **Spreading Activation 검색** — 계층별 감쇠율(0.5–0.95)에 따라 에너지를 전파하여 관련 지식을 찾는 그래프 기반 연상 검색
- **메모리 수명 주기 관리** — 5계층 간 지식의 자동 승격, 보관, 정리
- **다이얼로그 메타프롬프트 주입** — SessionStart 훅이 세션마다 다이얼로그 규율 메타프롬프트를 주입하며, 핵심 정체성에서 생성된 AI 컴패니언 페르소나를 함께 제공

```
# 지식 보관소 초기화
/maencof:maencof-setup

# 새로운 지식 기억하기
/maencof:maencof-remember

# 지식 그래프 검색하기
/maencof:maencof-recall
```

자세한 문서는 [maencof README (영문)](./packages/maencof/README.md) 또는 [maencof README (한글)](./packages/maencof/README-ko_kr.md)을 참조하세요.

### [`@ogham/atlassian`](./packages/atlassian/) — Jira & Confluence 통합

Python 기반 `mcp-atlassian` MCP 서버를 네이티브 TypeScript로 대체하여, Claude Code에서 Jira와 Confluence를 1급 시민으로 다룰 수 있게 해주는 플러그인입니다.

Jira와 Confluence를 쓰는 팀은 컨텍스트 비용을 치릅니다 — 수십 개의 도구 스키마가 매 프롬프트를 비대하게 만들고, 일반 MCP 도구는 도메인 워크플로우를 이해하지 못합니다. atlassian은 워크플로우 지식을 캡슐화한 도메인 전문가 에이전트와 지연 로딩으로 이 문제를 해결합니다.

**제공 컴포넌트:**

| 컴포넌트 | 수량 | 예시                                                                                                                                                                 |
| -------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Skills   | 5    | `/atlassian:atlassian-setup`, `/atlassian:atlassian-jira`, `/atlassian:atlassian-confluence`, `/atlassian:atlassian-download`, `/atlassian:atlassian-media-analysis` |
| MCP 도구 | 4    | `fetch`, `convert`, `auth-check`, `setup`                                                                                                                            |
| Agents   | 3    | jira, confluence, media (멀티모달 키프레임 분석)                                                                                                                     |
| Hooks    | 0    | —                                                                                                                                                                    |

**주요 기능:**

- **도메인 전문가 에이전트** — 세 개의 특화 에이전트(jira / confluence / media)가 15개 Jira 도메인 + 8개 Confluence 도메인 API 지식을 캡슐화하여 50개 이상의 개별 MCP 도구 스키마를 대체
- **지연 참조 로딩** — API 캡슐이 필요한 시점에만 도구 스키마를 로드하여 컨텍스트 윈도우를 절약
- **다중 포맷 변환** — Python `mcp-atlassian` 소스에서 포팅한 ADF / Storage / Wiki ↔ Markdown 컨버터 내장
- **멀티모달 미디어 분석** — Media 에이전트가 이미지 / 비디오 / GIF에서 키프레임을 추출하고 의미론적 장면 분석 수행
- **인증 커버리지** — Basic(email + token), PAT(Server / DC), OAuth 2.0(3LO) — Cloud와 Server / DC 모두 지원

```
# Jira / Confluence 인증 설정
/atlassian:atlassian-setup

# Jira 이슈 작업
/atlassian:atlassian-jira

# Confluence 페이지 작업
/atlassian:atlassian-confluence
```

자세한 문서는 [atlassian README (영문)](./packages/atlassian/README.md) 또는 [atlassian README (한글)](./packages/atlassian/README-ko_kr.md)을 참조하세요.

### [`@ogham/cogair`](./packages/cogair/) — Codex / Gemini CLI 위임

MCP 도구, 스킬, 라이프사이클 훅을 통해 Claude가 **OpenAI Codex CLI** 또는 **Google Gemini CLI**에 작업을 위임할 수 있게 해주는 Claude Code 플러그인입니다.

모델마다 강점이 다릅니다. Codex는 샌드박스 셸에서의 대규모 코드 생성에 강하고, Gemini는 실시간 웹 기반 리서치와 초대형 컨텍스트 종합에 강합니다. cogair는 이 위임을 명시적이고, 비율 인식적이며, 세션 간 재현 가능하게 만듭니다.

**제공 컴포넌트:**

| 컴포넌트 | 수량 | 예시                                                                     |
| -------- | ---- | ------------------------------------------------------------------------ |
| Skills   | 4    | `/cogair:setup`, `/cogair:codex`, `/cogair:gemini`, `/cogair:crosscheck` |
| MCP 도구 | 3    | `start_conversation`, `continue_conversation`, `open_settings`           |
| Agents   | 0    | (스킬이 외부 CLI에 직접 위임)                                            |
| Hooks    | 2    | SessionStart, UserPromptSubmit                                           |

**주요 기능:**

- **다중 모델 위임** — 코드 중심 작업은 Codex(샌드박스 셸, 리팩토링)로, 리서치 중심 작업은 Gemini(실시간 웹 검색, 대형 컨텍스트)로 키워드 기반 라우팅
- **교차 검증** — `/cogair:crosscheck`가 동일 프롬프트를 두 프로바이더에 병렬로 보내고 응답을 종합
- **로컬 설정 UI** — 127.0.0.1에 바인딩된 일회용 토큰 인증 웹 UI에서 프로바이더 비율, 개입 강도(-2 ~ +2), 키워드 라우팅, 기본 모델 별칭을 편집
- **세션 기록** — 프로젝트 해시 단위 세션과 재개 기능, SessionStart / UserPromptSubmit 훅이 비율 + 편차 + 카운터 상태를 컨텍스트에 주입

```
# 로컬 설정 UI 열기
/cogair:setup

# Codex CLI에 위임
/cogair:codex

# Gemini CLI에 위임
/cogair:gemini

# 두 프로바이더에 교차 검증 요청
/cogair:crosscheck
```

자세한 문서는 [cogair README (영문)](./packages/cogair/README.md) 또는 [cogair README (한글)](./packages/cogair/README-ko_kr.md)을 참조하세요.

### [`@ogham/imbas`](./packages/imbas/) — 기획 문서 → 이슈 파이프라인

기획 문서를 4-Phase 오케스트레이션 파이프라인을 통해 Jira 또는 GitHub 이슈로 변환하는 Claude Code 플러그인입니다.

전략 문서를 EARS 스타일의 잘 정돈된 개발자 티켓으로 옮기는 일은 반복적이고 오류가 잦습니다. imbas는 소스 플랜 검증부터 Story, Task, Subtask 생성까지 전체 흐름을 자동화하면서 모든 단계를 프로바이더 독립적으로 유지합니다.

**제공 컴포넌트:**

| 컴포넌트 | 수량 | 예시                                                                                                                    |
| -------- | ---- | ----------------------------------------------------------------------------------------------------------------------- |
| Skills   | 12   | `/imbas:imbas-pipeline`, `/imbas:imbas-validate`, `/imbas:imbas-split`, `/imbas:imbas-devplan`, `/imbas:imbas-manifest` |
| MCP 도구 | 16   | `run_create`, `manifest_save`, `manifest_implement_plan` 등                                                             |
| Agents   | 3    | analyst (sonnet), planner (sonnet), engineer (opus, maxTurns: 80)                                                       |
| Hooks    | 3    | pre-tool-use, context-injector, session-cleanup                                                                         |

**주요 기능:**

- **4-Phase 파이프라인** — validate → split → manifest-stories → devplan → manifest-devplan, Phase 간 체크포인트 파일 유지
- **프로바이더 추상화** — 단일 스킬이 `jira`, `github`, `local` 프로바이더를 동일하게 대상으로 함, 전환은 설정 변경만
- **에이전트 분리** — 역할별 특화된 세 에이전트(검증을 위한 analyst, 분할을 위한 planner, EARS Subtask 생성을 위한 engineer)
- **Run 기반 상태** — 파이프라인 실행마다 `run_id`와 `.imbas/runs/<id>/` 디렉토리를 생성하여 재개 가능하고 추적 가능

```
# imbas 설정 초기화
/imbas:imbas-setup

# 기획 문서에 대해 전체 파이프라인 실행
/imbas:imbas-pipeline

# 파이프라인 상태 확인
/imbas:imbas-status
```

자세한 문서는 [imbas README (영문)](./packages/imbas/README.md) 또는 [imbas README (한글)](./packages/imbas/README-ko_kr.md)을 참조하세요.

### [`@ogham/maencof-lens`](./packages/maencof-lens/) — 읽기 전용 볼트 접근

프로젝트 간 볼트 접근을 위한 maencof Knowledge Graph의 읽기 전용 래퍼 플러그인입니다. 개발 세션이 개인 볼트를 참조하되 쓰기 위험은 없이 사용할 수 있게 해줍니다.

maencof로 디자인 노트, 아키텍처 결정, 개인 리서치를 관리한다면, 그 결과물을 다른 프로젝트에서도 참조 자료로 활용하고 싶을 것입니다. maencof-lens는 다중 볼트 읽기를 계층 필터 가드를 통해 라우팅하여 개발 컨텍스트가 안전하게 지식을 빌려 쓸 수 있게 합니다.

**제공 컴포넌트:**

| 컴포넌트 | 수량 | 예시                                                                                                          |
| -------- | ---- | ------------------------------------------------------------------------------------------------------------- |
| Skills   | 3    | `/maencof-lens:maencof-lens-setup`, `/maencof-lens:maencof-lens-lookup`, `/maencof-lens:maencof-lens-context` |
| MCP 도구 | 5    | `search`, `context`, `navigate`, `read`, `status`                                                             |
| Agents   | 1    | researcher (자율 다중 도구 볼트 탐색)                                                                         |
| Hooks    | 1    | SessionStart (설정 감지 + 스킬 사용 가이드 주입)                                                              |

**주요 기능:**

- **설계 단계의 읽기 전용** — maencof 핸들러를 재사용하되 모든 변경 경로 차단, 모든 도구 호출에 계층 필터 가드(기본적으로 L1 제외) 적용
- **다중 볼트 라우팅** — `.maencof-lens/config.json`에 여러 볼트를 등록하고 이름으로 전환
- **토큰 예산 컨텍스트 조립** — `/maencof-lens:maencof-lens-context`가 목표 토큰 예산 안에서 관련 볼트 문서를 조립하여 프롬프트에 주입
- **자율 리서처** — `researcher` 에이전트가 스프레딩 액티베이션을 통해 다단계 볼트 심층 탐색 수행

```
# 볼트 등록 (첫 실행 시 기본 볼트 지정)
/maencof-lens:maencof-lens-setup

# 단일 주제 빠른 조회
/maencof-lens:maencof-lens-lookup

# 현재 작업을 위한 토큰 예산 멀티 문서 컨텍스트
/maencof-lens:maencof-lens-context
```

자세한 내용은 [maencof-lens 패키지](./packages/maencof-lens/)를 참조하세요.

---

## 전체 패키지 목록

| 패키지                                         | 타입          | 설명                                                        |
| ---------------------------------------------- | ------------- | ----------------------------------------------------------- |
| **[`filid`](./packages/filid/)**               | Claude plugin | FCA-AI 규칙 시행 및 프랙탈 컨텍스트 관리                    |
| **[`maencof`](./packages/maencof/)**           | Claude plugin | Knowledge Graph 기반 개인 지식 공간 관리                    |
| **[`atlassian`](./packages/atlassian/)**       | Claude plugin | 도메인 전문가 에이전트 기반 Jira / Confluence 통합          |
| **[`cogair`](./packages/cogair/)**             | Claude plugin | Claude Code에서 OpenAI Codex CLI / Google Gemini CLI로 위임 |
| **[`imbas`](./packages/imbas/)**               | Claude plugin | 기획 문서 → Jira / GitHub 이슈 변환 파이프라인              |
| **[`maencof-lens`](./packages/maencof-lens/)** | Claude plugin | 개발 컨텍스트를 위한 읽기 전용 볼트 Knowledge Graph 접근    |

---

## 개발 환경 설정

```bash
# 저장소 클론
dir=your-ogham && git clone https://github.com/vincent-kk/ogham.git "$dir" && cd "$dir"

# 의존성 설치
nvm use && yarn install && yarn build:all

# yarn 워크스페이스 사용
yarn workspace <package-name> <command>

# 테스트 실행
yarn workspace <package-name> test

# 빌드
yarn workspace <package-name> build
```

---

## 호환성

이 패키지는 ECMAScript 2022 (ES2022) 문법으로 작성되었습니다.

ES2022를 지원하지 않는 JavaScript 환경을 사용하는 경우, 이 패키지를 트랜스파일 대상에 포함해야 합니다.

**지원 환경:**

- Node.js 20.0.0 이상

**레거시 환경 지원:**
Babel 같은 트랜스파일러를 사용하여 대상 환경에 맞게 코드를 변환하세요.

---

## 버전 관리

이 프로젝트는 [Changesets](https://github.com/changesets/changesets)를 사용하여 버전 관리와 배포를 합니다.

### Changeset 생성

패키지에 변경사항이 있을 때, changeset을 만들어 변경 내용을 기록합니다:

```bash
yarn changeset
```

### 릴리즈

```bash
# changeset 기반으로 패키지 버전 업데이트
yarn changeset:version

# npm에 패키지 배포
yarn changeset:publish
```

### Changeset 가이드라인

- **patch**: 버그 수정, 문서 업데이트, 내부 리팩토링
- **minor**: 새 기능, 새 export, 비파괴적 변경
- **major**: 파괴적 변경, 제거된 export, API 변경

---

## 스크립트

- `yarn build:all` — 전체 패키지 빌드
- `yarn test` — 전체 패키지 테스트 실행
- `yarn lint` — 코드 스타일 검사
- `yarn typecheck` — TypeScript 타입 검증
- `yarn changeset` — 새 changeset 생성
- `yarn changeset:version` — changeset 기반 버전 업데이트
- `yarn changeset:publish` — npm에 패키지 배포
- `yarn tag:packages <commit>` — 각 패키지 버전 기반으로 Git 태그 생성

---

## 라이선스

이 저장소는 MIT 라이선스로 제공됩니다. 자세한 내용은 [`LICENSE`](./LICENSE) 파일을 참조하세요.

---

## 문의

프로젝트에 대한 질문이나 제안이 있으시면 이슈를 생성해주세요.

[English documentation (README.md)](./README.md) is also available.
