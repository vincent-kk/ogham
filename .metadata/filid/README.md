# .metadata — filid 플러그인 설계 문서 아카이브

> **목적**: 코드를 읽지 않아도 filid 플러그인의 전체상을 이해할 수 있는 설계 문서 모음.
>
> FCA-AI (Fractal Context Architecture for AI Agents) 규칙 시행 플러그인의 구조, 설계 의도,
> 라이프사이클, 사용법, 비용 분석, 동작 메커니즘을 문서화한다.

## 문서 상태와 우선순위

| 문서                    | 상태          | 용도                                       |
| ----------------------- | ------------- | ------------------------------------------ |
| 01–08                   | **현행 원장** | `@ogham/filid` 1.0의 승인된 설계·계약 서술 |
| FCA-AI 원자료·운영 명세 | 역사 자료     | 사상의 출발점; 1.0 규범은 01–08이 우선     |

01–08이 현재 계약의 단일 원장이다. 별도의 목표/계획 원장은 없다 — 목표가 곧 현재 구현이며,
설계가 바뀌면 코드와 이 문서를 같은 변경에서 함께 고친다. 코드와 이 문서가 어긋나면
**코드가 사실이고 문서가 결함이다.**

각 문서는 자기 영역의 원장이다. 다른 문서에서 같은 내용을 다시 쓰지 않고 링크한다.

| 영역                           | 원장 문서          |
| ------------------------------ | ------------------ |
| 아키텍처 결정(ADR)·제거 이력   | 01-ARCHITECTURE    |
| 모듈 구성과 알고리즘           | 02-BLUEPRINT       |
| 스킬 워크플로우와 훅 타임라인  | 03-LIFECYCLE       |
| 설치·설정·트러블슈팅           | 04-USAGE           |
| 규칙·상수·임계값·분류 우선순위 | 07-RULES-REFERENCE |
| MCP 계약과 DTO                 | 08-API-SURFACE     |

---

## 문서 목록

| #   | 문서                                          | 설명                                                                                       |
| --- | --------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 01  | [ARCHITECTURE.md](./01-ARCHITECTURE.md)       | 전체 구조 & 설계 철학 — FCA-AI 이론 매핑, 레이어, 디렉터리 구조, ADR 12개, 0.8.x 제거 목록 |
| 02  | [BLUEPRINT.md](./02-BLUEPRINT.md)             | 모듈별 기술 청사진 — 13개 도메인의 목적, 알고리즘, 입출력, 의존 방향                       |
| 03  | [LIFECYCLE.md](./03-LIFECYCLE.md)             | 라이프사이클 & 워크플로우 — 스킬 12개, merge-track 5단계, Hook 이벤트 타임라인             |
| 04  | [USAGE.md](./04-USAGE.md)                     | 설치, 설정, 사용 방법 — 빌드, config v2, 스킬·MCP 사용법, 트러블슈팅                       |
| 05  | [COST-ANALYSIS.md](./05-COST-ANALYSIS.md)     | 운영 비용 & 성능 영향 — Hook 오버헤드, MCP 비용, 컨텍스트 예산, 번들 크기                  |
| 06  | [HOW-IT-WORKS.md](./06-HOW-IT-WORKS.md)       | 내부 동작 메커니즘 — Hook 파이프라인, lexical scanner, snapshot, DAG, LCA, envelope        |
| 07  | [RULES-REFERENCE.md](./07-RULES-REFERENCE.md) | FCA-AI 규칙 레퍼런스 — 규칙 15개, 상수, 분류 우선순위, organ 면책, 검증 문서 모델          |
| 08  | [API-SURFACE.md](./08-API-SURFACE.md)         | 전체 공개 API — MCP 도구 9개 스키마, 공통 envelope, 핵심 DTO, config 계약                  |

---

## 읽기 순서 가이드

### 처음 접하는 경우

1. **[01-ARCHITECTURE](./01-ARCHITECTURE.md)** — 전체 그림 파악
2. **[07-RULES-REFERENCE](./07-RULES-REFERENCE.md)** — FCA-AI 규칙 이해
3. **[03-LIFECYCLE](./03-LIFECYCLE.md)** — 실제 사용 흐름 이해
4. **[04-USAGE](./04-USAGE.md)** — 설치 및 사용

### 구현 이해가 필요한 경우

1. **[02-BLUEPRINT](./02-BLUEPRINT.md)** — 모듈별 상세
2. **[06-HOW-IT-WORKS](./06-HOW-IT-WORKS.md)** — 내부 동작
3. **[08-API-SURFACE](./08-API-SURFACE.md)** — API 레퍼런스

### 운영/최적화가 필요한 경우

1. **[05-COST-ANALYSIS](./05-COST-ANALYSIS.md)** — 성능 영향 분석

---

## 문서 갱신 규칙

| 변경 유형          | 갱신 필요 문서                                      |
| ------------------ | --------------------------------------------------- |
| 새 모듈 추가       | 02-BLUEPRINT, 08-API-SURFACE                        |
| 상수/임계값 변경   | 07-RULES-REFERENCE                                  |
| 규칙 의미 변경     | 07-RULES-REFERENCE, 06-HOW-IT-WORKS, 배포 규칙 문서 |
| Hook 추가/수정     | 03-LIFECYCLE, 06-HOW-IT-WORKS, 05-COST-ANALYSIS     |
| MCP 도구 추가/수정 | 04-USAGE, 06-HOW-IT-WORKS, 08-API-SURFACE           |
| 스킬 추가/수정     | 03-LIFECYCLE, 04-USAGE                              |
| 아키텍처 결정      | 01-ARCHITECTURE, 02-BLUEPRINT                       |
| 빌드/의존성 변경   | 01-ARCHITECTURE, 04-USAGE, 05-COST-ANALYSIS         |

**canonical 규칙 문서(`plugins/filid/templates/rules/`)를 고치면 `yarn filid build:rules` + `rule_docs_sync`까지가 한 단위다.** 원본만 고치고 재배포하지 않으면 이 저장소에서 일하는 에이전트가 stale 규칙을 읽는다.

---

## 플러그인 핵심 수치

| 항목           | 값                                                                                                                                                          |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 버전           | 0.9.0-beta.1 (`private: true` — npm 라이브러리 표면 없음)                                                                                                   |
| 소스 파일      | 391개 `.ts` (테스트 제외) + 75개 테스트 파일                                                                                                                |
| 런타임 의존    | 2개 (`@modelcontextprotocol/sdk`, `zod`) — native 바이너리 0                                                                                                |
| MCP 도구       | **9개** — project_init, rule_docs_sync, open_settings, fractal_scan, context_resolve, restructure_plan, structure_validate, verification_scan, review_state |
| 내장 규칙      | **15개** ([07-RULES-REFERENCE](./07-RULES-REFERENCE.md#내장-규칙-15개))                                                                                     |
| 배포 규칙 문서 | **4개** (fractal-boundaries, module-documents, verification-records, code-placement — 모두 required)                                                        |
| 스킬           | **12개** — setup, scan, context-query, guide, enrich-docs, restructure, migrate + merge-track 5(pull-request, cross-review, resolve, revalidate, pipeline)  |
| 에이전트       | **0개** (cross-review는 고정 정의 없이 변경 그룹 reviewer와 독립 verifier를 실행)                                                                           |
| Hook 이벤트    | **3개** — SessionStart, UserPromptSubmit, PreToolUse(Read\|Write\|Edit)                                                                                     |
| Hook 브리지    | 4개 (setup.mjs, user-prompt-submit.mjs, pre-tool-use.mjs, run-agy.mjs)                                                                                      |
| 번들 크기      | 498,413 B (MCP 416,185 + 훅 3개 48,560 + settings UI 30,263 + 러너)                                                                                         |
| MCP 반환 예산  | 16 KiB — 초과분은 artifact로 이동                                                                                                                           |
