# 01. 전체 구조 & 설계 철학

> `@ogham/filid` 1.0 기준. 설계·개발의 단일 원장은 [vnext-redesign-plan.md](./vnext-redesign-plan.md) 이며, 이 문서는 그 결과로 실제 구현된 상태를 서술한다.

---

## FCA-AI 이론 요약

### Context Rot 문제

AI 에이전트가 대규모 코드베이스를 다룰 때의 핵심 문제는 넷이다.

1. **컨텍스트 창 한계** — 모든 코드를 한 번에 로드할 수 없다.
2. **문서 비동기화** — 코드와 문서가 시간이 지나며 괴리된다.
3. **정보 손실** — 세션 간 맥락이 유실된다.
4. **무분별한 성장** — 문서가 끝없이 비대해진다.

### FCA-AI 해법

전제는 하나다. **에이전트는 부족 기억을 갖지 않는다.** 파일이 스스로 드러내지 않는 것은 추측되고, 추측은 잘못된 편집이 된다. 그래서 모든 독립 모듈은 "프랙탈 노드"가 되어 셋을 갖는다.

1. **문서** — `INTENT.md`(의도·경계)와 `DETAIL.md`(현재 계약)
2. **진입점** — 외부 소비자가 참조하는 유일한 표면
3. **경계** — 외부는 진입점만, 내부는 서로를 직접 참조

노드 타입은 넷이다.

| 타입            | 의미                                         | 자동 분류      |
| --------------- | -------------------------------------------- | -------------- |
| `fractal`       | 독립 계약과 외부 경계를 가진 모듈            | 예             |
| `organ`         | 한 프랙탈에 소유되는 내부 관심사 compartment | 예             |
| `pure-function` | 외부 효과 없이 격리된 단위                   | 증거가 있을 때 |
| `hybrid`        | 점진적 이행을 위한 수동 transitional 상태    | 아니오         |

그리고 전체 의존성 그래프는 **DAG여야 한다.** 순환은 두 모듈이 하나인 척하는 상태이며, 읽는 순서가 존재하지 않는다는 뜻이다.

---

## filid 1.0의 책임 경계

제품의 중심에 두는 책임은 정확히 네 가지다.

1. `INTENT.md`와 `DETAIL.md`로 의도·경계·현재 계약을 관리한다.
2. fractal/organ/pure-function/hybrid 구조, 진입점, 외부 경계와 DAG를 검사한다.
3. 소비자와 공개 계약을 근거로 이동할 위치를 결정하고, 실행 가능한 `sourcePath → targetPath` 계획과 사후조건을 제공한다.
4. 위 FCA 증거만 사용하는 다관점 cross-review를 제공한다.

### 비목표

- 함수 분할, 한 파일 한 함수, 순수성, 명명, cyclomatic complexity, LCOM4, 파일 크기, 테스트의 fail-first 품질을 **일반 코드 품질 규칙으로 소유하지 않는다.**
- MCP가 범용 grep/search/replace, AST 편집, 파일 이동, import rewrite, commit, push, PR 생성을 대신하지 않는다.
- cross-review가 보안·제품성·UI·운영성 리뷰를 대표하지 않는다. verdict는 FCA 계약과 구조에 대한 verdict다.
- `DETAIL.md` 외부에 두 번째 acceptance-criteria 원장을 유지하지 않는다.

### 이론 → 구현 매핑

| FCA-AI 개념               | 구현                                       | 소유 모듈                                  |
| ------------------------- | ------------------------------------------ | ------------------------------------------ |
| 프랙탈 / organ 분류       | `classifyNode()`                           | `core/tree/organClassifier/`               |
| 트리 구축과 소유 관계     | `buildFractalTree()`, `scanProject()`      | `core/tree/fractalTree/`                   |
| INTENT.md 50줄·3-tier     | `validateIntentMd()`                       | `core/rules/documentValidator/`            |
| DETAIL.md 필수 섹션·AC    | `validateDetailMd()` + acceptance group    | `core/rules/documentValidator/`            |
| 15개 FCA 규칙 평가        | `loadBuiltinRules()`, `evaluateRules()`    | `core/rules/ruleEngine/`                   |
| 의존성 DAG와 실제 cycle   | `buildDependencyGraph()`, `detectCycles()` | `core/analysis/dependencyGraph/`           |
| 다중 소비자 LCA           | `findLowestCommonFractal()`                | `core/analysis/lcaCalculator/`             |
| spec/test 역할과 case cap | `analyzeVerification()`, policy            | `core/verification/`                       |
| 단일 사실 원본            | `createProjectSnapshot()`                  | `core/projectSnapshot/`                    |
| 최소 문서 체인            | `resolveContext()`                         | `core/contextResolver/`                    |
| 읽기 전용 배치 계획       | `createRestructurePlan()` + validators     | `core/restructure/`                        |
| 생태계 사실 수집          | Structure/Verification Adapter             | `adapters/ecmascript/`                     |
| 16 KiB envelope·artifact  | `toolResult()`, artifact store             | `mcp/server/`, `core/infra/artifactStore/` |
| 문서 write gate           | `validatePreToolUse()`                     | `hooks/preToolUse/`                        |

### Seiri와의 소유권 경계

| 주제                                   | 개념 소유자 | filid의 구체 책임                          |
| -------------------------------------- | ----------- | ------------------------------------------ |
| 한 파일 한 exported function           | Seiri       | 분리 결과가 organ인지 fractal인지 판정     |
| 함수/파일 분리 방법                    | Seiri       | 분리된 단위의 소유 프랙탈과 목표 경로 결정 |
| purity/effect boundary                 | Seiri       | `pure-function` 노드의 의존 격리 검사      |
| 이름·파일 크기·CC·LCOM4                | Seiri       | FCA 판정의 자동 gate로 쓰지 않음           |
| 테스트 유효성·fail-first·coverage      | Seiri       | 검증 문서 역할과 파일별 cap만 검사         |
| INTENT/DETAIL                          | filid       | 소유, 검증, 최소 컨텍스트 체인 제공        |
| fractal/organ/entry point/boundary/DAG | filid       | 소유, 스캔, 위반 판정                      |
| LCA와 공유 단위 배치                   | filid       | lowest common **fractal** 계산과 목표 경로 |
| cross-review                           | filid       | FCA 증거 수집, 다관점 판정, 오탐 검증      |

이 연결은 런타임 의존이 아니다. filid는 Seiri API를 호출하지 않으며, Seiri가 설치되지 않은 프로젝트에서도 자체 기능을 모두 수행한다.

---

## 레이어와 의존성 방향

```
┌──────────────────────────────────────────────────────────┐
│  host boundary                                            │
│  mcp/    9 tools + settings page                          │
│  hooks/  SessionStart · UserPromptSubmit · PreToolUse     │
└───────────────────────────┬──────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────┐
│  core/ — language-neutral FCA engine                      │
│  tree · rules · analysis · verification                   │
│  projectSnapshot · contextResolver · restructure · infra  │
└───────────────────────────┬──────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────┐
│  adapters/ — ecosystem evidence                           │
│  registry · ecmascript(structure, verification)           │
└───────────────────────────┬──────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────┐
│  types/ · constants/ · lib/   (organs)                    │
└──────────────────────────────────────────────────────────┘
```

실제 edge 방향은 `core → adapters` 이며 역방향 edge는 0이다. core가 어댑터 레지스트리를 호출해 사실을 모으고, 어댑터는 core를 전혀 모른다. 이 방향이 "생태계 리터럴은 어댑터 밖으로 새지 않는다"를 구조적으로 보장한다.

- `adapters/`가 확장자, 진입점 후보, framework convention, import/export 문법, spec/test 탐색 패턴과 case 호출 문법을 소유한다.
- `core/`는 이 중 어느 것도 알지 못한다. 어댑터가 보고한 경로와 certainty만 읽는다.
- `mcp/`와 `hooks/`는 host 경계이며 정책 판단을 하지 않는다.

새 생태계는 core, policy, MCP DTO 수정 없이 어댑터 등록만으로 추가된다. 새 어댑터 때문에 이 셋 중 하나가 바뀐다면 설계 위반이다.

### 3계층 사용자 표면

| 계층      | 역할                    | 실행 시점          | 인터페이스          |
| --------- | ----------------------- | ------------------ | ------------------- |
| **Hook**  | 규칙 시행·컨텍스트 전달 | 자동 (이벤트 기반) | stdin/stdout JSON   |
| **MCP**   | 결정론적 분석·판정      | 스킬 호출 시       | JSON-RPC over stdio |
| **Skill** | 고수준 작업 단위        | 사용자 `/command`  | SKILL.md 프롬프트   |

1.0에는 고정 페르소나 agent 계층이 없다. cross-review의 역할 프롬프트는 `skills/cross-review/reviewers/`의 작은 reference 파일이다.

### 외부 의존성

| 패키지                        | 용도                 |
| ----------------------------- | -------------------- |
| `@modelcontextprotocol/sdk`   | MCP 서버 프레임워크  |
| `zod`                         | 스키마 검증          |
| `@ogham/cross-platform`       | portable path 계산   |
| `@ogham/agent-artifacts`      | 호스트 artifact 경로 |
| `esbuild` (dev)               | 번들링               |
| `vitest` · `playwright` (dev) | 테스트               |

native 바이너리 의존과 전역 npm 모듈 탐색은 없다.

---

## 디렉터리 구조

```
plugins/filid/
├── src/
│   ├── adapters/              # 생태계 증거 수집
│   │   ├── registry/          #   등록·해석 (claim, 동률 판정)
│   │   └── ecmascript/        #   초기 어댑터
│   │       ├── structure/     #     lexical scanner, 진입점, 의존성
│   │       └── verification/  #     spec/test 역할과 case 계산
│   ├── core/                  # 언어 중립 FCA 엔진
│   │   ├── tree/              #   fractalTree · organClassifier · boundaryDetector
│   │   ├── rules/             #   ruleEngine(15) · fractalValidator · documentValidator
│   │   ├── analysis/          #   dependencyGraph · lcaCalculator
│   │   ├── verification/      #   analyzer · policy · contracts
│   │   ├── projectSnapshot/   #   snapshotHash · evidence
│   │   ├── contextResolver/   #   documents · pathing
│   │   ├── restructure/       #   planner · imports · validator
│   │   └── infra/             #   configLoader · cacheManager · artifactStore
│   ├── mcp/
│   │   ├── server/            #   registry, envelope, wrapHandler
│   │   ├── serverEntry/       #   번들 진입점
│   │   ├── tools/             #   9개 도구
│   │   └── pages/settings/    #   설정 UI canonical source
│   ├── hooks/                 # setup · userPromptSubmit · preToolUse · shared
│   ├── types/                 # 언어 중립 공개 DTO (organ)
│   ├── constants/             # rule·verification·envelope 상수 (organ)
│   └── lib/                   # 작은 runtime utility (organ)
├── skills/                    # 12개 사용자 workflow (merge-track 5 포함)
├── scripts/                   # rules · pages · mcp · hooks · plugin 생성
├── templates/                 # 문서 템플릿과 managed rule canonical source
├── libs/                      # cross-platform Node 러너 (run.cjs)
├── bridge/ · public/          # 커밋되는 런타임 생성물
└── .codex-plugin/ · *.json    # plugin-compiler 가 만드는 host별 생성물
```

`bridge/`, `public/`, `.codex-plugin/`, 루트 `plugin.json`, `mcp_config.json`, `hooks.json`, `AGENTS.md`, `src/version.ts`는 **생성물이다.** 손으로 편집하지 않고 생성기를 고친다.

---

## 설계 결정 기록 (ADR)

### ADR-01 — native parser를 쓰지 않고 확신을 분리한다

**상태**: 채택 (1.0에서 ADR-1 "TypeScript Compiler API 선택"을 대체)

`@ast-grep/napi`(tree-sitter)와 TypeScript Compiler API 의존을 모두 제거하고, 어댑터의 작은 lexical scanner가 문자열·주석과 괄호 nesting만 구분한다. 대신 모든 분석 결과에 `exact | indeterminate | unsupported` 3분법을 부여한다.

**근거**: 마켓플레이스로 배포되는 플러그인에서 native 바이너리 의존은 지속적인 설치 실패원이다. 그리고 구조 위반을 보고하는 도구는 자신 있게 틀린 답을 내는 순간 가치가 0이 된다. "덜 정확하되 모를 때 모른다고 말함"이 "정확하지만 가끔 확신에 찬 오답"보다 낫다.

**트레이드오프**: 동적 table, 사용자 wrapper, 해석 불가능한 alias는 정확한 개수를 낼 수 없다. 이때 `indeterminate`를 반환하며 절대 PASS로 변환하지 않는다.

### ADR-02 — 생태계 리터럴은 어댑터 안에만 둔다

**상태**: 채택

core, policy, MCP DTO에는 파일 확장자, 진입점 파일명, 테스트 호출 문법이 없다.

**근거**: 이것이 다언어 지원의 유일한 진입 조건이다. core가 `index.ts`를 알면 다음 생태계는 core 수정을 요구한다.

**트레이드오프**: core는 어댑터가 보고하지 않은 사실을 스스로 보충할 수 없다. 어느 어댑터도 소유를 주장하지 않는 파일은 `unsupported`로 남는다.

### ADR-03 — restructure는 읽기 전용이다

**상태**: 채택

filid는 위치를 결정하고 계획과 사후조건을 반환한다. 파일 이동과 import 편집은 외부 실행자가 한다.

**근거**: 계획이 감사 가능해지고 실행자가 교체 가능해진다. AST 없이 import rewrite를 직접 수행하면 반드시 추측이 섞인다.

**트레이드오프**: 실행 단계가 하나 늘어난다. 대신 계획과 다른 위치로 옮긴 결과는 기능이 동작해도 postcondition FAIL로 잡힌다.

### ADR-04 — 모든 판정은 하나의 snapshot을 소비한다

**상태**: 채택

scan, validate, plan이 같은 `ProjectSnapshot`을 읽는다. hash는 정렬된 상대 경로와 구조 판정에 사용된 파일 내용의 SHA-256을 결합하며, root 경로와 mtime에 독립이다.

**근거**: 같은 실행 안에서 서로 다른 트리를 보는 도구들은 모순된 결과를 낸다. mtime 기반 판정은 checkout·clone에서 거짓 변경을 만든다.

### ADR-05 — acceptance 원장은 DETAIL.md 하나뿐이다

**상태**: 채택 (`.filid/criteria.md` 폐지)

발견된 legacy ledger는 자동 삭제·자동 변환 없이 `legacy-criteria-ledger` finding과 이관 대상 DETAIL.md 경로를 보고한다.

**근거**: 두 번째 원장은 반드시 갈라진다. 그러나 사용자 데이터를 도구가 임의로 변환하는 것은 더 나쁘다. 제거 시점은 사용자가 정한다.

### ADR-06 — spec-document 15, test-record 32, 승격 없음

**상태**: 채택 (기존 "3+12" 규칙과 promotion 폐지)

현재 계약을 압축해 보여주는 spec-document는 파일당 15 cases, QA·회귀·장애 재현을 보존하는 test-record는 파일당 32 cases다. 프로젝트 전체 총량 제한은 없다.

**근거**: "현재 계약"과 "역사 기록"은 다른 문서 역할이며, 시간이 지난다고 후자가 전자가 되지 않는다. "3 basic + 12 complex" 분할은 규칙이 아니라 민속이었다.

**트레이드오프**: 숫자 15와 32 자체는 관례다. 규칙의 무게는 두 역할의 구분이 진다.

### ADR-07 — 모든 MCP 반환은 공통 envelope와 16 KiB 예산을 쓴다

**상태**: 채택

초과분은 plugin cache의 `artifacts/<tool>/<sha256>.json`에 atomic write하고 경로·크기·SHA-256만 반환한다. restructure plan은 크기와 무관하게 항상 artifact를 남긴다.

**근거**: 컨텍스트는 에이전트 세션의 가장 희소한 자원이다. 도구가 우회할 수 있는 예산은 예산이 아니다.

### ADR-08 — 코드 품질 규칙을 소유하지 않는다

**상태**: 채택

`naming-convention`, cyclomatic complexity, LCOM4, file-size, coverage 규칙을 built-in에서 제거했다.

**근거**: 개념 소유자가 다르다(위 Seiri 경계표). 두 도구가 같은 규칙을 서로 다른 임계로 시행하면 사용자는 둘 다 끈다.

### ADR-09 — npm 라이브러리 표면을 갖지 않는다

**상태**: 채택 (ADR-2의 번들링 결정은 유지)

`package.json`은 `private: true`이며 `exports`/`main`/`types`와 `dist` 빌드가 없다. 빌드 대상은 MCP 진입점(CJS)과 hook 진입점(ESM)뿐이다.

**근거**: filid는 플러그인이지 라이브러리가 아니다. 소비자 없는 공개 표면은 유지 비용만 만든다.

### ADR-10 — cross-review는 고정 3관점 + 적대적 판정이다

**상태**: 채택 (페르소나 위원회 선출 폐지)

contract·structure·verification 세 관점이 한 번 병렬로 의견을 내고, 별도 판정자가 모든 blocking finding을 `CONFIRMED | PLAUSIBLE | REFUTED`로 판정한다. REFUTED는 verdict에서 빠지되 arbitration log에 남는다.

**근거**: 결정론적 위원회 선출은 재현성을 주었지만 관점 수만큼 비용을 곱했다. FCA 증거는 세 축으로 나뉘고, 오탐 제거는 관점 추가가 아니라 반증으로 해결된다.

---

## 관련 문서

- [02-BLUEPRINT.md](./02-BLUEPRINT.md) — 모듈별 상세 청사진
- [03-LIFECYCLE.md](./03-LIFECYCLE.md) — 라이프사이클 & 워크플로우
- [04-USAGE.md](./04-USAGE.md) — 설치·설정·사용법
- [06-HOW-IT-WORKS.md](./06-HOW-IT-WORKS.md) — 내부 동작 메커니즘
- [07-RULES-REFERENCE.md](./07-RULES-REFERENCE.md) — 전체 규칙 레퍼런스
- [08-API-SURFACE.md](./08-API-SURFACE.md) — MCP 계약과 core DTO
