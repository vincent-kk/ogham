# 02. 모듈별 기술 청사진

> `@ogham/filid` 1.0 기준. 각 모듈의 목적, 핵심 알고리즘, 공개 시그니처, 의존 관계.

---

## 도메인 개요

```
src/
├── types/       12 파일   언어 중립 공개 DTO (organ)
├── constants/   20 파일   rule·verification·envelope 상수 (organ)
├── lib/                   작은 runtime utility (organ)
├── adapters/    2 sub     생태계 증거 수집 (registry, ecmascript)
├── core/        8 sub     언어 중립 FCA 엔진
├── mcp/         4 sub     9개 도구와 설정 페이지의 host boundary
└── hooks/       5 sub     3개 수명주기 + shared organ
```

의존 방향은 `core → adapters` 이며 역방향 edge는 0이다. 자세한 근거는 [01-ARCHITECTURE](./01-ARCHITECTURE.md#레이어와-의존성-방향) 참조.

---

## 1. types/ — 언어 중립 공개 DTO

| 파일              | 소유 개념                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| `fractal.ts`      | `NodeType`, `FractalNode`, `FractalTree`, `EntryPointDescriptor`, `DependencyGraph`, `ProjectSnapshot` |
| `adapters.ts`     | `StructureAdapter`, `VerificationAdapter`, `AdapterRegistry`, `AdapterClaim`, `DependencyReference`    |
| `verification.ts` | `VerificationFileAnalysis`, `VerificationProjectAnalysis`, `VerificationViolation`                     |
| `documents.ts`    | `ThreeTierBoundary`, `IntentMdSchema`, `DetailMdSchema`, `DetailAcceptanceGroup`                       |
| `restructure.ts`  | `MoveInstruction`, `RestructurePlan`, `ImportRewrite`, `PlanValidationResult`                          |
| `context.ts`      | `ContextDocumentRef`, `ContextResolution`                                                              |
| `toolEnvelope.ts` | `ToolStatus`, `ToolPayload`, `ToolResultEnvelope`, `ToolArtifact`                                      |
| `rules.ts`        | `Rule`, `RuleViolation`, `RuleEvaluationResult`, `RuleOverride`, `BuiltinRuleId`                       |
| `report.ts`       | `ScanReport`, `ValidationReport`, `VerificationScanSummary`                                            |
| `scan.ts`         | `ScanOptions`                                                                                          |
| `hooks.ts`        | `HookBaseInput`, `PreToolUseInput`, `UserPromptSubmitInput`, `HookOutput`                              |
| `index.ts`        | 이름 지정 재수출 배럴                                                                                  |

**이 조직의 규범**: 여기에는 프로그래밍 언어의 확장자, 진입점 파일명, 테스트 호출 문법이 등장하지 않는다. `EntryPointDescriptor.path`처럼 어댑터가 채우는 값만 있다.

---

## 2. constants/ — 상수 organ

정적 상수 객체와 배열은 함수 밖 module scope에 둔다. 함수 안에는 입력에서 계산되는 동적 collection만 둔다.

| 파일                        | 소유 값                                                         |
| --------------------------- | --------------------------------------------------------------- |
| `builtinRuleIds.ts`         | 15개 rule ID object enum                                        |
| `documentValidation.ts`     | `INTENT_MD_LINE_LIMIT`, `BOUNDARY_KEYWORDS`                     |
| `organNames.ts`             | `KNOWN_ORGAN_DIR_NAMES` (base 9 + test/infra 6)                 |
| `verificationThresholds.ts` | 15 / 32 cap과 역할별 매핑                                       |
| `toolEnvelope.ts`           | 16 KiB 예산, artifact 경로·해시 규약, 오류 메시지               |
| `nodeTypes.ts`              | `fractal / organ / pure-function / hybrid`                      |
| `analysisCertainties.ts`    | `exact / indeterminate / unsupported`                           |
| `ruleScopes.ts`             | 6개 검증 scope                                                  |
| `restructure.ts`            | placement kind, artifact role, decision reason, validation code |
| `reviewState.ts`            | Git 인자, 해시 규약, branch key 정규화 패턴                     |
| `mcpContracts.ts`           | 도구 계약 상수 (validation mode, rule-doc action)               |
| `mcpToolNames.ts`           | 정확히 9개 도구 이름                                            |
| `legacyCriteriaLedger.ts`   | legacy ledger 경로와 rule metadata                              |
| `scanDefaults.ts`           | 기본 include/exclude, `maxDepth`, skip 집합                     |
| `pathMarkers.ts` 등         | 경로 marker, 훅 기본값, infra 기본값, rule 문서 상수            |

---

## 3. adapters/ — 생태계 증거 수집

### registry/

**목적**: 어댑터 등록과 프로젝트별 해석.

```
registerStructure(adapter) / registerVerification(adapter) → void
resolveStructure(projectRoot) → Promise<StructureAdapter[]>
resolveVerification(projectRoot) → Promise<VerificationAdapter[]>
```

**핵심 알고리즘**: 각 어댑터의 `detect(projectRoot)`가 반환한 `AdapterClaim { confidence, evidence }`를 비교한다.

- 최고 confidence 단일 어댑터 → 소유
- **동률 다중 어댑터 → `ambiguous-adapter-claim` 오류.** 임의로 하나를 고르지 않는다.
- 주장 없음 → `unsupported`
- 요청된 ID가 미등록 → config warning이 아니라 명시적 validation finding

**의존**: `types/adapters`

### ecmascript/structure/

**목적**: 현재 저장소 생태계의 구조 증거.

```
discoverSourceFiles(projectRoot) → Promise<string[]>
findEntryPoints(directoryPath)   → Promise<EntryPointDescriptor[]>
inspectEntryPoint(path)          → Promise<EntryPointInspection>
extractDependencies(filePath)    → Promise<DependencyReference[]>
isFrameworkOwnedPeer(filePath)   → Promise<boolean>
suggestEntryPointPath(dirPath)   → Promise<string>
```

**핵심 알고리즘**: 외부 native parser를 쓰지 않는 lexical scanner. 문자열·주석 구간과 괄호 nesting만 구분하며, 확실히 계산할 수 없는 구조는 값을 지어내지 않고 `indeterminate`로 반환한다. 정확성보다 **억지 PASS를 피하는 것이 우선**이다.

파일 확장자, 진입점 후보, framework convention, import/export 문법은 이 디렉터리 밖으로 새지 않는다.

### ecmascript/verification/

**목적**: 검증 문서 역할 판정과 의미론적 case 계산.

```
classify(filePath)               → spec-document | test-record | unsupported
count(filePath)                  → VerificationCaseCount
extractContractGroupIds(filePath) → string[]
```

**핵심 알고리즘**: 일반 case·skip·todo는 각 1, 정적 parameterized row는 행 수만큼, 정적 parameterized suite 안의 case는 suite row 수를 곱한다. property test 선언은 생성 시행과 무관하게 1이다. 동적 table·사용자 wrapper·해석 불가 alias가 개수에 영향을 주면 `indeterminate`다. `filid:contract` 토큰은 주석에서만 추출한다.

---

## 4. core/tree/ — 노드 발견과 분류

### fractalTree/

**목적**: 디렉터리 traversal, 트리 구축, 소유 관계 수립.

```
scanProject(projectRoot, options) → NodeEntry[]
buildFractalTree(NodeEntry[])     → FractalTree
findNode / getAncestors / getDescendants / getFractalsUnderOrgans
```

**핵심 알고리즘**: `fs.readdirSync(dir, { withFileTypes: true })` 재귀만 사용한다 (`fs.globSync`는 Node 22+ API이므로 금지). 부모-자식은 경로 길이 오름차순 정렬 후 최장 접두 매칭으로 수립한다. `maxDepth`는 traversal 절단이 아니라 **검증 한계**로 적용되므로 초과 node도 진단 대상에 남는다.

### organClassifier/

**목적**: 노드 타입 판정.

```
classifyNode(ClassifyInput) → NodeType
```

**핵심 알고리즘**: 8단계 우선순위 ([07-RULES-REFERENCE](./07-RULES-REFERENCE.md#분류-우선순위) 참조). **분류는 서술이지 규범이 아니다** — 문서도 module index도 없는 디렉터리는 독립 계약을 주장한 적이 없으므로 기본값이 `organ`이고, 무엇이 fractal이어야 하는가는 `external-import-boundary`의 규칙 결과로 보고된다. 진입점 중 `kind: 'module'`만 분류 신호로 읽으므로 `executable`·`framework`와 config override는 노드 타입을 바꾸지 못한다. organ 아래에서도 traversal이 멈추지 않으며, organ 안에서 문서나 module index를 가진 하위 디렉터리는 **독립 fractal로 재분류된다.**

### boundaryDetector/

**목적**: 파일 경로에서 패키지 경계 탐색과 문서 체인 수집.

---

## 5. core/rules/ — 문서 parser와 15개 규칙

### documentValidator/

```
validateIntentMd(content)            → IntentMdValidation
validateDetailMd(content, previous?) → DetailMdValidation
countLines(content)                  → number
```

`acceptanceGroups/` organ이 `### <stable-id> — <title>` 형식의 acceptance group을 추출하고 누락·중복을 거부한다. `boundaryExemptions/` organ의 `parseBoundaryExemptions(content)`가 조건부 `## Boundary Exemptions` 섹션을 읽어 `DetailMdValidation.boundaryExemptions`를 채운다. 두 파서는 heading 형태를 공유하지만 ID 문자 집합은 공유하지 않는다 — organ path에는 경로 구분자가 온다. 섹션 부재가 정상이며, `Reason`이 빈 항목은 면책이 아니라 미충족 계약으로 보고된다.

### ruleEngine/

```
loadBuiltinRules(overrides) → RuleSet          (정확히 15개)
evaluateRules(context)      → RuleEvaluationResult
evaluateRule(rule, context) → RuleViolation[]
```

**핵심 알고리즘**: `granularity: project` 규칙은 snapshot당 한 번, `node` 규칙은 대상 node마다 한 번 실행한다. `utils/` organ에 관심 증거별 순수 check 함수가 있다 (`checkModuleEntryPoint`, `checkExternalImportBoundary`, `checkPureFunctionIsolation`, `checkZeroPeerFile`, `checkVerificationPolicy`, `checkLegacyCriteriaLedger` 등).

thrown check와 unsupported evidence는 **PASS가 아니라 finding**으로 변환된다.

### fractalValidator/

구조·의존 검증을 노드 단위로 수행한다.

---

## 6. core/analysis/ — 그래프와 배치

### dependencyGraph/

```
buildDependencyGraph(nodePaths, references, certainty?, { organPaths }?) → DependencyGraph
resolveOwningOrganPath(organPaths, ownerPath, filePath)                 → string | null
detectCycles(graph)                                                      → string[][]
getDirectDependencies / topologicalSort
```

**핵심 알고리즘**: 어댑터의 dependency reference를 소유 fractal로 승격해 edge를 만들고, 각 edge는 `sourceFile` · `rawSpecifier` · `resolvedPath`를 증거로 갖는다. cycle은 **실제 directed closed route**를 반환한다. 그래프를 만들 수 없는 파일이 결론에 영향을 줄 수 있으면 전체 결과가 `indeterminate`다.

소유 subtree 안의 organ 참조는 **edge로는 보존되지만 cycle adjacency에서 빠진다.** 부모 소유 organ을 자식 fractal이 참조할 때 생기는 `부모 → 자식 → 부모` 왕복은 승격 인공물이지 런타임 순환이 아니다. edge를 지우지 않는 이유는 `restructure_plan`이 incoming edge로 소비자를 계산하기 때문이다.

`resolveOwningOrganPath`는 `ownerPath` 안에 있으면서 `filePath`를 담는 **가장 깊은** organ을 돌려준다. organ이 fractal의 조상일 수도 있어 owner 안 containment를 함께 요구한다. 진입점에서 공개되므로 그래프와 rule engine이 같은 판정을 공유한다.

`builders/`와 `cycles/` organ으로 나뉘어 있다 — 파일당 공개 함수 하나 규칙 때문이다.

### lcaCalculator/

```
resolveOwningFractal(tree, path)          → FractalNode | null
findLowestCommonFractal(tree, consumers)  → FractalNode | null
getAncestorPaths(tree, path)              → string[]
```

**핵심 알고리즘**: 문자열 공통 prefix가 아니다. 각 consumer를 소유 fractal로 올린 뒤 모든 owner의 ancestor chain 교집합에서 가장 깊은 **fractal**을 고른다. organ은 LCA가 될 수 없다. 소비자 중 하나라도 owner를 알 수 없으면 root fallback 없이 `null`.

경로 비교·containment는 `@ogham/cross-platform`의 portable API로 수행해 현재 host와 무관하게 POSIX/Windows 의미를 보존한다.

---

## 7. core/verification/ — 15/32 모델

```
analyzeVerification(input)          → VerificationProjectAnalysis
evaluateVerificationPolicy(analysis) → VerificationViolation[]
findSpecFragmentation(...)          → VerificationViolation[]
resolveContractGroups(...)          → ContractGroupsByOwner
```

`analyzer/`, `policy/`, `contracts/` organ으로 나뉜다. core는 파일명이나 확장자가 아니라 **역할**(`spec-document` / `test-record`)만 안다.

---

## 8. core/projectSnapshot/ — 단일 사실 원본

```
createProjectSnapshot(projectRoot, options) → Promise<ProjectSnapshot>
computeSnapshotHash(inputs)                 → string
```

**핵심 알고리즘**: 정렬된 상대 경로와 구조 판정에 사용된 파일 내용의 SHA-256을 결합한다. **root 경로와 mtime에 독립적이며** 내용과 구조 변화에만 반응한다. `evidence/collectLegacyCriteriaLedger.ts`가 legacy `.filid/criteria.md`의 절대 경로와 이관 대상 root DETAIL 경로를 보존하며, ledger bytes도 hash 입력에 포함된다.

`outputLanguage`는 snapshot 생성에 사용한 config의 문서 출력 언어이며 `context_resolve`가 config 재조회 없이 그대로 반환한다.

---

## 9. core/contextResolver/ — 최소 문서 체인

```
resolveContext(snapshot, targetPath) → ContextResolution
```

owner에서 root 방향의 문서 **경로**만 반환한다. 본문은 반환하지 않으며 호출자가 필요한 경로만 읽는다. target이 project 밖이거나 owner를 결정할 수 없으면 명시적 오류이며 root 문서를 임의 fallback으로 고르지 않는다.

`documents/`와 `pathing/` organ으로 나뉜다.

---

## 10. core/restructure/ — 읽기 전용 배치 계획

```
createRestructurePlan(snapshot, input)        → RestructurePlan
validatePlanPreconditions(snapshot, plan)     → PlanValidationResult
validatePlanPostconditions(snapshot, plan)    → PlanValidationResult
```

organ 구성:

| organ         | 역할                                                                  |
| ------------- | --------------------------------------------------------------------- |
| `planner/`    | consumer 해석, contract intent, unit kind, target 후보, 필수 artifact |
| `imports/`    | exact path-like evidence일 때만 portable relative rewrite 산출        |
| `specifiers/` | specifier stem 판정과 소비자 확장자 표기 복원                         |
| `validator/`  | 사전·사후조건 검사와 구조화된 finding                                 |

네 organ은 **flat leaf**다. 그 아래 `helpers/`를 만들지 않고 분리 함수 파일을 organ에 평탄하게 둔다 — FCA organ leaf 규칙이 helper 하위 배치 기본보다 우선한다.

`specifiers/`는 `imports/`와 `validator/` 둘의 소비 대상이므로 두 organ의 lowest common fractal인 `restructure` 아래에 놓였다. specifier가 resolved file을 가리키는지는 마지막 세그먼트의 확장자를 제거한 stem으로 판정하고, 산출된 specifier에는 소비자가 쓰던 표기를 되돌려 준다 — 판정과 복원이 한 곳에 있어야 계획과 사후조건이 같은 기준을 쓴다.

instruction은 세 갈래로 나뉜다. decision이 필요하면 `unresolved`, 계산된 target이 source와 같으면 `alreadyPlaced`, 나머지가 실행 가능한 `moves`다. 가운데 갈래가 없으면 postcondition이 한 경로에 "source 부재"와 "target 존재"를 동시에 요구해 어떤 실행으로도 만족시킬 수 없다.

**핵심 계약**: 프로젝트 파일을 쓰거나 옮기지 않는다. 불확실한 contract, 이름, adapter entry shape, graph 또는 specifier는 추측하지 않고 unresolved reason으로 남긴다. 확장자 표기 차이는 순수 lexical 연산이라 core가 처리하지만, alias 해석처럼 **어댑터 의미**가 필요한 rewrite는 계산하지 않는다.

---

## 11. core/infra/ — host persistence 경계

| 모듈            | 역할                                                         |
| --------------- | ------------------------------------------------------------ |
| `configLoader`  | config v2 검증·비파괴 migration·승인 저장, managed rule 문서 |
| `cacheManager`  | 세션/프롬프트 cache, visit 트랜잭션, delivery 기록           |
| `artifactStore` | 16 KiB overflow와 `persistence: always` artifact 저장        |

`artifactStore`는 lexical containment와 symlink-descendant 검사를 **모두** 통과한 뒤에만 쓰며, atomic rename을 사용한다.

`configLoader`의 `loaders/`는 v2 schema·types·v1 migration·load/write/init을, `utils/`는 project/plugin root 해석과 strict sanitize를 소유한다.

---

## 12. mcp/ — host boundary

```
serverEntry/  startServer()
server/       createServer(), toolResult(), toolError(), wrapHandler()
tools/        9개 handler
pages/settings/ 설정 UI canonical source (esbuild → public/settings.html)
```

`wrapHandler(toolName, exactSchema, handler)`는 SDK에 광고하는 object schema를 유지하면서 내부에서 exact schema를 검증하고, parse failure까지 공통 `toolError` envelope로 바꾼다.

`toolResult(toolName, payload)`가 materialize와 compact MCP text 직렬화를 수행한다. artifact와 inline text는 **같은 serializer**를 쓰며 `Map`/`Set` 정규화, byte 계산, SHA-256 입력이 모두 그 직렬화 결과를 기준으로 한다.

도구별 organ은 `utils/`에 순수 helper를 둔다 (예: `verificationScan/utils/`의 summary·diagnostics·status 빌더, `structureValidate/utils/readRestructurePlan.ts`).

---

## 13. hooks/ — Claude Code 훅 계층

| 모듈               | 이벤트             | 역할                                         |
| ------------------ | ------------------ | -------------------------------------------- |
| `setup`            | `SessionStart`     | 캐시 초기화, 만료 세션 정리, FCA 감지        |
| `userPromptSubmit` | `UserPromptSubmit` | 턴당 visit map 리셋, 세션 첫 규칙 포인터     |
| `preToolUse`       | `PreToolUse`       | INTENT 체인 전달 + INTENT/DETAIL write gate  |
| `shared` organ     | —                  | `isFcaProject` / `isIntentMd` / `isDetailMd` |
| `utils` organ      | —                  | `validateCwd`, portable visited-path 해석    |

`preToolUse/helpers/`의 `intentInjector`, `preToolValidator`, `structureGuard`가 한 프로세스 안에서 순차 실행된다. `processVisit(input)` 단일 계약과 POSIX/Windows portable visited-path 해석을 적용한다.

**엔트리 파일(`*.entry.ts`)에는 로직을 두지 않는다.** stdin→핸들러→stdout 파이프뿐이다.

**훅 직접 import 원칙**: 훅 도달 코드는 배럴(`index.js`)을 import하지 않고 구체 파일 경로로 직접 import한다. typecheck는 이를 잡지 못하며 `scripts/buildHooks.mjs`의 바이트 캡과 금지 모듈 가드가 최종 방어선이다.

---

## 데이터 흐름

```
[프로젝트 디렉터리]
        │
        ▼
 adapters/registry ── detect/claim ──→ 소유 어댑터 결정
        │
        ▼
 adapters/ecmascript ── lexical scan ──→ entry points · dependencies · verification files
        │
        ▼
 core/tree ── traversal + classify ──→ FractalTree
        │
        ▼
 core/projectSnapshot ── hash + evidence ──→ ProjectSnapshot   ← 단일 사실 원본
        │
        ├──→ core/rules        ──→ RuleViolation[]  (15 rules)
        ├──→ core/analysis     ──→ DependencyGraph · LCA
        ├──→ core/verification ──→ 15/32 · fragmentation · contract link
        ├──→ core/contextResolver ──→ 문서 경로 chain
        └──→ core/restructure  ──→ RestructurePlan (읽기 전용)
                                          │
                                          ▼
                              mcp/server ── toolResult ──→ envelope
                                          │
                            ≤16 KiB → inline │ >16 KiB → artifact + path/sha256
```

---

## 관련 문서

- [01-ARCHITECTURE.md](./01-ARCHITECTURE.md) — 전체 아키텍처와 ADR
- [06-HOW-IT-WORKS.md](./06-HOW-IT-WORKS.md) — 내부 동작 메커니즘
- [07-RULES-REFERENCE.md](./07-RULES-REFERENCE.md) — 규칙과 상수
- [08-API-SURFACE.md](./08-API-SURFACE.md) — MCP 계약과 DTO
