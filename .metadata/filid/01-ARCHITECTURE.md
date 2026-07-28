# 01. 전체 구조 & 설계 철학

> `@ogham/filid` 1.0 기준. 이 문서가 아키텍처와 설계 결정의 원장이며, 실제 구현된 상태를 서술한다.

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

| 타입            | 의미                                         | 자동 분류 조건                              |
| --------------- | -------------------------------------------- | ------------------------------------------- |
| `fractal`       | 독립 계약과 외부 경계를 가진 모듈            | 문서 또는 `kind: "module"` 진입점이 있을 때 |
| `organ`         | 한 프랙탈에 소유되는 내부 관심사 compartment | **기본값** (아무것도 선언하지 않았을 때)    |
| `pure-function` | 외부 효과 없이 격리된 단위                   | 어댑터가 무부작용을 증명했을 때             |
| `hybrid`        | 점진적 이행을 위한 수동 transitional 상태    | 없음 — 수동 지정만                          |

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

런타임 `dependencies`는 둘뿐이다.

| 패키지                      | 용도                |
| --------------------------- | ------------------- |
| `@modelcontextprotocol/sdk` | MCP 서버 프레임워크 |
| `zod`                       | 스키마 검증         |

나머지는 `devDependencies`이며 번들 시점에 소스로 들어가거나 빌드·테스트에만 쓰인다.

| 패키지                     | 용도                                  |
| -------------------------- | ------------------------------------- |
| `@ogham/cross-platform`    | portable path 계산 (소스 최다 사용처) |
| `@ogham/agent-artifacts`   | 호스트 artifact 경로                  |
| `@ogham/http-kit`          | settings 페이지 loopback 서버         |
| `@ogham/session-finalizer` | 세션 종료 시 캐시 정리                |
| `esbuild`                  | MCP·hook 번들링                       |
| `vitest` · `playwright`    | 단위·E2E 테스트                       |

native 바이너리 의존과 전역 npm 모듈 탐색은 없다.

### 0.8.x에서 사라진 것

1.0은 표면을 줄이는 릴리스다. 아래는 **되돌릴 계획이 없는 제거**이며, 각 항목의 대체 경로를 함께 적는다.

| 사라진 것                                                                   | 개수 변화  | 대체 / 사유                                                            |
| --------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------- |
| `@ast-grep/napi` (tree-sitter native)                                       | 의존 제거  | 어댑터의 lexical scanner + certainty 3분법 (ADR-01)                    |
| `fast-glob`                                                                 | 의존 제거  | `fs.readdirSync` 재귀 traversal                                        |
| TypeScript Compiler API 사용                                                | 제거       | 같음 (ADR-01)                                                          |
| npm 라이브러리 표면 (`exports`·`main`·`types`·`dist`)                       | 제거       | `private: true`. 빌드 대상은 MCP(CJS)·hook(ESM) 진입점뿐 (ADR-09)      |
| `build:compile` (`tsc -p tsconfig.build.json`)                              | 제거       | 라이브러리 산출물이 없으므로 컴파일 단계 자체가 불필요                 |
| MCP 도구 19개 → **9개**                                                     | −10        | [08-API-SURFACE](./08-API-SURFACE.md#10에서-제거된-도구) 대응표        |
| 사용자 스킬 19개 → **12개**                                                 | −7         | [03-LIFECYCLE](./03-LIFECYCLE.md) 제거 사유표                          |
| 페르소나 에이전트 14개 → **0개**                                            | −14        | cross-review 고정 3관점 + 적대적 판정 (ADR-10)                         |
| Hook 이벤트 4개 → **3개**                                                   | −1         | `SubagentStart` 역할 제한 훅 제거 (에이전트 계층이 사라짐)             |
| Hook 모듈 `changeTracker`·`agentEnforcer`                                   | 제거       | `PostToolUse` change tracking과 subagent 역할 강제를 하지 않는다       |
| `.filid/criteria.md` acceptance 원장                                        | 폐지       | DETAIL.md 단일 원장. 발견 시 `legacy-criteria-ledger` finding (ADR-05) |
| `.filid/debt.md` 부채 원장                                                  | 폐지       | 거부 사유는 `.filid/review/<branch>/justifications.md` 하나로 통일     |
| "3 basic + 12 complex" 테스트 규칙과 승격                                   | 폐지       | spec-document 15 / test-record 32 역할 구분 (ADR-06)                   |
| `naming-convention`·`index-barrel-pattern`·CC·LCOM4·file-size·coverage 규칙 | 제거       | 코드 품질은 filid의 개념 소유가 아니다 (ADR-08)                        |
| canonical 규칙 문서 `filid_fca-policy.md` 1개                               | 4개로 분할 | 로딩 조건이 다른 4개 required 문서                                     |

계약 수준의 파급은 셋이다. **첫째**, 플러그인을 npm 패키지로 import하던 경로가 없다 — 소비 경로는 MCP 도구와 훅뿐이다. **둘째**, 제거된 도구를 호출하던 스킬은 복원이 아니라 9개 도구 위로 재작성됐다. **셋째**, `resolve`는 코드를 쓰지 않는다 — 수용·거부 결정과 기록만 소유하고 적용은 메인 에이전트나 다른 플러그인에 위임하며, 적용되지 않은 수용 항목은 `revalidate`가 `unapplied`로 보고한다.

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

### ADR-11 — 분류는 서술이지 규범이 아니다

**상태**: 채택 (기본값 `fractal` → `organ`)

분류기는 디스크에 있는 파일만 관찰한다. 문서도 module index도 선언하지 않은 디렉터리는 `organ`이다. 무엇이 fractal이어야 *하는가*는 분류 기본값이 아니라 규칙 결과다 — 소유 subtree 밖에서 소비되는 organ을 `external-import-boundary`가 소비자 경로를 증거로 보고하고, organ 이름인데 INTENT.md 하나로 fractal이 된 디렉터리를 `organ-no-intentmd`가 보고한다.

**근거**: 기본값이 fractal이면 아직 FCA를 채택하지 않은 코드베이스의 모든 디렉터리에 "INTENT.md를 추가하라"는 요구가 자동 생성되고, 분류가 "하위 디렉터리가 우연히 있는지" 같은 우발적 사실에 좌우된다. 반대로 분류기를 `INTENT.md ∨ index`만으로 좁히면 채택 과정에 눈이 먼다 — 아무것도 fractal이 아니니 `setup`이 제안할 것이 없다. 두 일을 분리하는 것이 해법이다: 분류기는 관찰하고, 규칙 엔진이 누락 fractal을 보고한다.

**트레이드오프**: FCA를 이미 채택한 트리에서도 index 없는 fractal은 organ으로 보인다. 그것이 의도다 — 진입점 없는 모듈은 아직 경계를 선언하지 않았다.

**파급**: 분류 입력은 `kind: "module"` 진입점으로 한정된다. `executable`·`framework` 진입점과 config `entryPointOverrides`로 주입된 경로는 분류를 바꾸지 못한다. 그 구분이 없으면 `SKILL.md` 같은 markdown-as-implementation이 산문 디렉터리를 fractal로 만들어, 코드용으로 쓰인 규칙을 산문에 적용하게 된다.

### ADR-12 — organ 접근은 소비자 위치로 판정하고, 면책은 선언한다

**상태**: 채택

organ은 진입점을 갖지 않는 것이 정의이므로 "진입점을 경유하라"를 적용할 대상이 없다. 소유 subtree **안**에서는 구체 파일 직접 참조가 정상이고, **밖**에서는 소유 프랙탈의 진입점을 경유한다. 밖에서의 직접 참조는 소유 프랙탈 `DETAIL.md`의 조건부 `## Boundary Exemptions`에 선언된 면책이 있을 때만 허용된다.

**같은 선언이 fractal 내부에도 적용된다.** 진입점을 경유할 수 _없는_ 정당한 소비자가 있기 때문이다. 표준 사례는 둘이다 — 훅 번들은 배럴을 import하면 배럴이 재노출하는 모듈 전체를 끌어오고, 검증 파일은 내부 단위를 검사하려다 테스트만이 소비자인 export를 공개 표면에 밀어넣게 된다. 선언하지 않으면 그대로 위반으로 남는다.

**근거**: 존재하지 않는 경유지를 요구하면 organ의 모든 파일 참조가 자동으로 위반이 된다. 이 저장소 자체 스캔에서 `external-import-boundary` 708건 중 대부분이 organ 대상이었다 — 708개 import를 고칠 문제가 아니라 규칙 의미를 정할 문제였다.

**트레이드오프**: 면책이 규칙을 끄는 우회로가 될 수 있다. 그래서 `Reason`이 load-bearing이다 — 비어 있으면 면책이 아니라 미충족 계약으로 보고된다. 직접 import 면책의 표준 사례는 훅 번들이다.

**파급**: 소유 subtree 안의 organ 참조는 cycle adjacency에서도 빠진다. 자식이 부모 소유 organ을 참조해 생기는 왕복은 승격 인공물이지 런타임 순환이 아니다. edge 자체는 보존한다 — `restructure_plan`이 incoming edge로 소비자를 계산하기 때문이다.

---

## 1.0 계약 수용 기준

각 항목은 **관찰 가능한 결과**다. 하나라도 깨지면 그것은 의견 차이가 아니라 회귀다. 상세는 오른쪽 원장 문서에 있다.

| ID    | 계약                                                                                                                                                                                             | 상세                                                |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| AC-01 | spec-document 15 cases는 PASS, 16은 violation                                                                                                                                                    | [07](./07-RULES-REFERENCE.md)                       |
| AC-02 | test-record 32 cases는 PASS, 33은 violation                                                                                                                                                      | [07](./07-RULES-REFERENCE.md)                       |
| AC-03 | 여러 test-record의 총 case 수에는 제한이 없다                                                                                                                                                    | [07](./07-RULES-REFERENCE.md)                       |
| AC-04 | 정적 parameterized 16 rows는 16으로 계산되어 violation                                                                                                                                           | [07](./07-RULES-REFERENCE.md)                       |
| AC-05 | dynamic·unsupported count는 PASS가 아니라 `indeterminate`/`unsupported`                                                                                                                          | [07](./07-RULES-REFERENCE.md)                       |
| AC-06 | 서로 다른 DETAIL acceptance group의 여러 spec은 PASS                                                                                                                                             | [07](./07-RULES-REFERENCE.md)                       |
| AC-07 | 같은 group을 나눈 여러 spec은 `spec-fragmentation`                                                                                                                                               | [07](./07-RULES-REFERENCE.md)                       |
| AC-08 | sibling 소비자의 공유 단위는 lowest common fractal의 organ으로 계획된다                                                                                                                          | [06](./06-HOW-IT-WORKS.md)                          |
| AC-09 | 독립 공개 계약 단위는 fractal과 필수 artifact로 계획된다                                                                                                                                         | [06](./06-HOW-IT-WORKS.md)                          |
| AC-10 | `restructure_plan`은 프로젝트 tree를 변경하지 않는다                                                                                                                                             | ADR-03                                              |
| AC-11 | stale snapshot은 plan precondition FAIL                                                                                                                                                          | [06](./06-HOW-IT-WORKS.md)                          |
| AC-12 | 잘못된 target·entry·import·DAG는 postcondition FAIL                                                                                                                                              | [06](./06-HOW-IT-WORKS.md)                          |
| AC-13 | 대형 결과는 작은 inline summary와 검증 가능한 artifact path를 반환한다                                                                                                                           | ADR-07 · [08](./08-API-SURFACE.md)                  |
| AC-14 | 새 verification 생태계는 core·policy·MCP DTO 수정 없이 adapter 등록만으로 추가된다                                                                                                               | ADR-02                                              |
| AC-15 | Seiri가 설치되지 않아도 filid는 모든 자체 기능을 수행한다                                                                                                                                        | 위 소유권 경계표                                    |
| AC-16 | `@ast-grep/napi`, 전역 npm 탐색, `fast-glob` 없이 build가 성공한다                                                                                                                               | ADR-01 · ADR-09                                     |
| AC-17 | DAG rule이 실제 cycle을 검출하며 placeholder PASS가 없다                                                                                                                                         | [07](./07-RULES-REFERENCE.md)                       |
| AC-18 | cross-review finding은 FCA 증거만 인용하고 구조 수정은 exact plan을 쓴다                                                                                                                         | ADR-10 · [03](./03-LIFECYCLE.md)                    |
| AC-19 | MCP 도구는 정확히 9개, 사용자 스킬은 정확히 12개                                                                                                                                                 | [08](./08-API-SURFACE.md) · [03](./03-LIFECYCLE.md) |
| AC-20 | core·policy·DTO에는 특정 생태계의 확장자·테스트 호출 리터럴이 없다                                                                                                                               | ADR-02                                              |
| AC-21 | merge-track 5스킬이 9개 도구 표면만으로 동작하며 제거된 도구를 참조하지 않는다                                                                                                                   | [03](./03-LIFECYCLE.md)                             |
| AC-22 | `resolve`는 코드를 직접 수정하지 않고 적용을 위임하며, 수용·거부 결정과 사유가 기록된다                                                                                                          | [03](./03-LIFECYCLE.md)                             |
| AC-23 | `pipeline --auto`가 pull-request → cross-review → resolve → revalidate를 중단 없이 잇는다                                                                                                        | [03](./03-LIFECYCLE.md)                             |
| AC-24 | `config-wizard` 없이 `project_init` + `open_settings`만으로 config v2 생성·조회·저장이 완결된다                                                                                                  | [04](./04-USAGE.md)                                 |
| AC-25 | 문서도 module index도 없는 디렉터리는 `organ`이며, override 경로는 분류를 바꾸지 못한다                                                                                                          | ADR-11 · [07](./07-RULES-REFERENCE.md)              |
| AC-26 | 소유 subtree 안의 organ 직접 참조는 통과, 밖은 위반, `Boundary Exemptions` 선언이 있으면 통과                                                                                                    | ADR-12 · [07](./07-RULES-REFERENCE.md)              |
| AC-27 | 자식 fractal이 부모 소유 organ을 참조해도 cycle로 판정되지 않는다                                                                                                                                | ADR-12 · [06](./06-HOW-IT-WORKS.md)                 |
| AC-28 | organ 이름 디렉터리가 INTENT.md만으로 fractal이 되면 `organ-no-intentmd` warning이 나오고, DETAIL.md나 module 진입점이 있으면 침묵한다                                                           | ADR-11 · [07](./07-RULES-REFERENCE.md)              |
| AC-29 | 소스 확장자를 그대로 적을 수 없는 생태계(`.js`로 참조되는 `.ts`, 확장자 생략)에서도 import rewrite가 exact evidence로 산출된다                                                                   | [08](./08-API-SURFACE.md)                           |
| AC-30 | git이 무시하면서 추적하지 않는 경로는 snapshot 증거에 들어가지 않고, git이 답하지 못하면 필터 이전과 동일하게 스캔한다                                                                           | [06](./06-HOW-IT-WORKS.md)                          |
| AC-31 | 계산된 target이 source와 같은 요청은 `alreadyPlaced`로 분리되어 `moves`에 없고, 그 계획의 postcondition은 `source-still-present`를 내지 않되 유닛이 계획된 경로에 없으면 `target-missing`을 낸다 | [08](./08-API-SURFACE.md)                           |
| AC-32 | rule roster와 `createDefaultConfig`가 같은 severity 정본을 읽어, config 없는 프로젝트와 `project_init` 프로젝트의 규칙 severity가 규칙 참조표와 일치한다                                         | [07](./07-RULES-REFERENCE.md)                       |

---

## 관련 문서

- [02-BLUEPRINT.md](./02-BLUEPRINT.md) — 모듈별 상세 청사진
- [03-LIFECYCLE.md](./03-LIFECYCLE.md) — 라이프사이클 & 워크플로우
- [04-USAGE.md](./04-USAGE.md) — 설치·설정·사용법
- [06-HOW-IT-WORKS.md](./06-HOW-IT-WORKS.md) — 내부 동작 메커니즘
- [07-RULES-REFERENCE.md](./07-RULES-REFERENCE.md) — 전체 규칙 레퍼런스
- [08-API-SURFACE.md](./08-API-SURFACE.md) — MCP 계약과 core DTO
