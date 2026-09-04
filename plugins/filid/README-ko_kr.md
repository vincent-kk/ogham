# @ogham/filid

코드베이스의 모듈 경계와 계약 문서를 정직하게 유지하는 Claude Code 플러그인입니다.

코드베이스가 커지면 AI 에이전트가 맥락을 잃고, 문서는 코드와 어긋나고, 디렉터리 구조는 형태를 잃습니다. filid는 **프랙탈 아키텍처(FCA-AI)** 로 정확히 그 문제만 다룹니다. `INTENT.md`와 `DETAIL.md`를 소유하고, fractal/organ 구조와 의존성 DAG를 검사하고, 공유 단위가 있어야 할 위치를 결정하고, 그 증거만으로 변경을 리뷰합니다.

filid는 저장소 전역 코드 품질 규칙 엔진이 아닙니다. cross-review의 커밋 변경 범위 밖에서는 이름, 함수 크기, 순환 복잡도, 응집도 지표, 테스트 품질과 커버리지를 판정하지 않습니다. 그 범위 안에서는 결함·보안·성능·유지보수·테스트·문서·FCA 증거를 함께 검토하고, 불확실한 증거는 추측하지 않고 명시적으로 남깁니다.

---

## 설치

### Marketplace를 통한 설치 (권장)

```bash
# 1. Marketplace에 저장소 등록
claude plugin marketplace add https://github.com/vincent-kk/ogham

# 2. 플러그인 설치
claude plugin install filid
```

설치 후 별도 설정 없이 스킬, MCP 서버, 훅이 자동 등록됩니다.

### 개발자용 로컬 설치

```bash
# 모노레포 루트에서
yarn install

# 플러그인 빌드
yarn filid build

# Claude Code에 로드
claude --plugin-dir ./plugins/filid
```

빌드 산출물은 다음과 같습니다.

- `bridge/mcp-server.cjs` — MCP 서버 (도구 9개)
- `bridge/{setup,user-prompt-submit,pre-tool-use}.mjs` — 훅 스크립트 3개
- `public/settings.html` — `open_settings`가 서빙하는 설정 UI

native 의존성과 전역 모듈 탐색이 없습니다. 런타임에 필요한 것은 MCP SDK와 Zod뿐입니다.

---

## 사용법

filid 스킬은 CLI 명령이 아니라 **LLM 프롬프트**입니다. Claude Code에서 자연어로 호출하며, 플래그 없이 평범한 문장으로도 동작합니다.

### 프로젝트 초기화

```
/filid:setup
/filid:setup ./packages/my-app
```

`.filid/config.json`을 쓰고, managed FCA rule 문서를 배포하고, 구조 스냅샷을 뜬 뒤 누락된 `INTENT.md` / `DETAIL.md`를 제안합니다. 기존 문서는 건드리지 않습니다.

### 프로젝트 감사

```
/filid:scan
/filid:scan src/core 쪽만 봐줘
```

전체 FCA 감사의 유일한 진입점입니다. node 분류, 문서 계약, entry point 표면, 외부 import 경계, 실제 의존성 DAG, 검증 문서 cap을 하나의 스냅샷에 대해 한 번에 평가합니다.

### 좁은 질문 던지기

```
/filid:context-query src/core/restructure
/filid:guide organ 디렉터리엔 뭘 두면 돼?
```

`context-query`는 대상 경로의 소유 프랙탈과 owner-to-root 최소 문서 체인을 해석한 뒤 3라운드 안에 답합니다. `guide`는 현재 트리와 배치 규칙을 설명하며 아무것도 바꾸지 않습니다.

### 문서 품질 개선

```
/filid:enrich-docs src/core
```

스냅샷 증거를 근거로 `INTENT.md` / `DETAIL.md`를 개선합니다. 편집 전에 승인을 받고, 편집 후 구조를 검증합니다.

### 코드를 있어야 할 곳으로

```
/filid:restructure src/shared/formatDate.ts
```

읽기 전용 배치 계획을 만듭니다. `sourcePath → targetPath`, 각 이동의 근거, 필요한 문서와 진입점, 정확한 import rewrite를 반환합니다. filid는 파일을 옮기지 않습니다. 실행은 사용자나 에이전트가 하고, filid는 그 뒤 사후조건을 정확히 검증합니다. 계획과 다른 위치로 옮기면 기능이 동작해도 FAIL입니다.

### 변경 리뷰

```
/filid:cross-review
/filid:cross-review --base origin/main
```

먼저 `review_state(scope)`가 커밋 변경 파일 roster와 changed-scope FCA 증거를 기록합니다. 이어 각 파일을 계층형 규칙으로 리뷰하고, 효율 모델 verifier가 모든 후보를 `CONFIRMED | REFUTED | INDETERMINATE`로 독립 검증합니다. 확인된 finding만 fix request에 반영하며 verdict는 커밋된 변경 범위만 판정합니다.

### legacy 문서명 이관

```
/filid:migrate
```

`CLAUDE.md` → `INTENT.md`, `SPEC.md` → `DETAIL.md`를 dry-run 우선의 이식 가능한 스크립트로 옮기고 결과를 검증합니다.

---

## 자동으로 동작하는 것

훅 3개가 사용자 개입 없이 동작합니다.

| 이벤트             | 동작                                                               |
| ------------------ | ------------------------------------------------------------------ |
| `SessionStart`     | 세션 캐시 초기화, FCA 프로젝트 여부 감지                           |
| `UserPromptSubmit` | 턴당 visit map 리셋, 세션 첫 FCA 규칙 포인터 주입                  |
| `PreToolUse`       | 소유 모듈의 INTENT 체인 전달, `INTENT.md` / `DETAIL.md` write gate |

차단이 발생하면 사유를 설명하고 해당 도구 호출 하나만 거부합니다. 턴은 중단되지 않습니다.

---

## 스킬 목록

| 스킬                   | 역할                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| `/filid:setup`         | config·rule 문서 초기화, 누락 INTENT/DETAIL 제안                                                 |
| `/filid:scan`          | 전체 FCA 감사의 유일한 진입점                                                                    |
| `/filid:context-query` | 소유 프랙탈과 최소 문서 체인 해석                                                                |
| `/filid:guide`         | 현재 트리·분류·배치 규칙 설명                                                                    |
| `/filid:enrich-docs`   | 스냅샷 증거 기반 INTENT/DETAIL 개선 (승인 후 편집)                                               |
| `/filid:restructure`   | 읽기 전용 계획 → 승인 → 외부 실행 → 사후조건 검증                                                |
| `/filid:cross-review`  | 커밋 변경을 파일별 계층 규칙·changed-scope FCA 증거로 리뷰하고 효율 모델로 모든 후보를 독립 검증 |
| `/filid:migrate`       | legacy CLAUDE.md / SPEC.md 이름 이관                                                             |
| `/filid:pull-request`  | 문서 동기화 후 구조화된 GitHub PR 생성                                                           |
| `/filid:resolve`       | fix request 수용·거부 결정, 위임, 정당화 기록                                                    |
| `/filid:revalidate`    | 교정 delta 재측정과 최종 PASS/FAIL 판정                                                          |
| `/filid:pipeline`      | merge-track 4단계를 한 번에 실행 (재개 지원)                                                     |

---

## 핵심 규칙

filid가 실제로 만들 수 있는 증거에 각각 대응하는 내장 규칙 15개입니다.

| 규칙                       | 검사 내용                                               |
| -------------------------- | ------------------------------------------------------- |
| `intent-document-contract` | INTENT.md 50줄 이하와 3-tier 경계 섹션                  |
| `detail-document-contract` | DETAIL.md 필수 섹션과 acceptance group                  |
| `organ-no-intentmd`        | organ 디렉터리의 INTENT.md 금지                         |
| `entry-point-surface`      | 진입점의 공개 표면을 열거할 수 있는가                   |
| `module-entry-point`       | 모든 fractal / hybrid 노드의 진입점 존재                |
| `max-depth`                | 설정된 트리 깊이                                        |
| `circular-dependency`      | 실제 의존성 그래프에 cycle 없음                         |
| `pure-function-isolation`  | `pure-function` 노드가 fractal·hybrid를 import하지 않음 |
| `zero-peer-file`           | fractal root의 허용되지 않은 peer 파일 금지             |
| `external-import-boundary` | 외부 소비자는 내부 파일이 아닌 진입점을 import          |
| `spec-document-case-cap`   | spec-document 파일당 의미론적 case 15개 이하            |
| `test-record-case-cap`     | test-record 파일당 의미론적 case 32개 이하              |
| `spec-fragmentation`       | cap 회피를 위한 계약 그룹 분할 금지                     |
| `spec-contract-link`       | 여러 spec-document가 서로 다른 DETAIL group을 선언      |
| `legacy-criteria-ledger`   | legacy `.filid/criteria.md`와 이관 대상 DETAIL.md 보고  |

어댑터가 정확히 측정하지 못한 규칙은 PASS가 아니라 `indeterminate` finding을 냅니다.

---

## MCP 도구

| 도구                 | 역할                                    |
| -------------------- | --------------------------------------- |
| `project_init`       | 프로젝트 FCA 초기화                     |
| `rule_docs_sync`     | managed rule 문서 동기화                |
| `open_settings`      | 설정 UI                                 |
| `fractal_scan`       | 스냅샷 트리 검사                        |
| `context_resolve`    | 한 스냅샷의 소유/문서 체인 일괄 해석    |
| `restructure_plan`   | 배치 결정, plan artifact 반환           |
| `structure_validate` | 프로젝트 또는 계획의 사전·사후조건 검증 |
| `verification_scan`  | spec-document / test-record 계약 판정   |
| `review_state`       | cross-review 상태·변경 roster·FCA 증거  |

모든 도구가 동일한 envelope를 사용합니다. 반환은 작게 유지되며, 16 KiB를 넘으면 content-addressed artifact로 저장하고 경로와 SHA-256으로 참조합니다.

---

## 개발

```bash
yarn filid test:run     # 단일 실행 (CI)
yarn filid typecheck    # 타입 체크
yarn filid build        # rules + pages + mcp + hooks + plugin adapters
yarn filid build:plugin # pages + mcp + hooks만 — 훅·MCP 반복 개발용
yarn filid test:e2e     # 설정 페이지 Playwright e2e
```

### 기술 스택

TypeScript 5.7, @modelcontextprotocol/sdk, Zod, esbuild, Vitest, Playwright

---

## 문서

기술 문서는 [`.metadata/`](../../.metadata/filid/) 디렉터리를 참조하세요.

| 문서                                                           | 내용                                       |
| -------------------------------------------------------------- | ------------------------------------------ |
| [ARCHITECTURE](../../.metadata/filid/01-ARCHITECTURE.md)       | 설계 철학, 레이어링, ADR                   |
| [BLUEPRINT](../../.metadata/filid/02-BLUEPRINT.md)             | 모듈별 기술 청사진                         |
| [LIFECYCLE](../../.metadata/filid/03-LIFECYCLE.md)             | 스킬 워크플로와 훅 타임라인                |
| [USAGE](../../.metadata/filid/04-USAGE.md)                     | 설정 구조, MCP/Hook 예시, 트러블슈팅       |
| [COST-ANALYSIS](../../.metadata/filid/05-COST-ANALYSIS.md)     | 훅 오버헤드, 번들 크기, 컨텍스트 토큰 비용 |
| [HOW-IT-WORKS](../../.metadata/filid/06-HOW-IT-WORKS.md)       | 어댑터, 스냅샷, DAG, MCP 라우팅            |
| [RULES-REFERENCE](../../.metadata/filid/07-RULES-REFERENCE.md) | 상수와 임계값을 포함한 전체 규칙 카탈로그  |
| [API-SURFACE](../../.metadata/filid/08-API-SURFACE.md)         | MCP 도구 계약과 core DTO                   |

[영문 문서(README.md)](./README.md)도 제공합니다.

---

## 라이선스

MIT
