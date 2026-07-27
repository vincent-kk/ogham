# Filid vNext 재설계 — 진행 원장

> 계획 원장: [`vnext-redesign-plan.md`](./vnext-redesign-plan.md)
>
> 작업 브랜치: `filid/issue-101`
>
> 시작일: 2026-07-26

대화 기억보다 이 문서, 계획 원장, 실제 Git diff를 우선한다. 작업 0부터 9까지
순서대로 닫으며, scoped verification이 통과하기 전에는 완료로 기록하지 않는다.

## 현재 상태

- 진행 중: 작업 5 — 공통 artifact envelope와 9개 MCP 도구
- 완료: 작업 0, 작업 1, 작업 2, 작업 3, 작업 4
- 후속 완료 조건: 작업 0–9 뒤 전체 상수·함수 경계·FCA 적합성 리팩터링,
  독립 plugin 리뷰, AC 문서 대조 검증과 review seam별 로컬 커밋
- 검증 순서: 중간 작업에서는 scoped test/typecheck/build만 실행하고 전체
  Filid 구조검사는 개발·리팩터링 완료 후 한 번 수행
- 계획 이탈: 작업 1의 FCA 문서 보강/settings field rename과 작업 2의
  runnable spec 설정/acceptance validator organ 이동, 작업 3의 snapshot
  output-language 계약·내부 helper organ 보완, 작업 4의 flat organ helper
  배치와 compatibility wrapper 조기 전환
- 최종 검증 대기: loopback settings unit 16건과 Playwright는 sandbox의
  `listen EPERM` 및 비샌드박스 승인 사용 한도로 실행하지 못함

## 작업 기록

### 작업 0 — 규범과 root 계약을 1.0으로 전환

- 변경: Filid/root/core/MCP/cache/config/fractal-scan 계약을 1.0 목표로
  재구성하고 모든 대상 DETAIL.md에 acceptance groups를 추가했다. canonical
  FCA policy를 14개 rule, spec-document 15, test-record 32, adapter 중립성,
  read-only restructure와 FCA-scope cross-review 계약으로 교체했다.
- 주요 파일: `plugins/filid/{INTENT.md,DETAIL.md}`,
  `plugins/filid/src/{INTENT.md,core/{INTENT.md,DETAIL.md},mcp/INTENT.md}`,
  대상 하위 DETAIL/INTENT 문서,
  `plugins/filid/templates/rules/filid_fca-policy.md`.
- 검증:
  - `yarn filid build:rules` — exit 0; manifest의 canonical rule hash 1개만 변경.
  - `yarn filid typecheck` — exit 0.
  - `git diff --check` — exit 0.
  - `filid:scan plugins/filid` — 82개 INTENT의 line/boundary, organ classification,
    spec cap 점검; 새 violation 0. 이름 기반 보조 점검이 문서 우선 분류된 두
    `hooks/` fractal을 organ으로 본 2건은 scanner 판정과 충돌한 오탐으로 제외.
- 계획 이탈: 없음.

### 작업 1 — adapter 계약과 language-neutral tree scan

- 변경: 공통 StructureAdapter/registry와 초기 ECMAScript adapter를 추가하고
  source discovery, entry point, framework-owned peer, dependency/export
  lexical evidence를 adapter 안으로 격리했다. core tree는 Node `readdir`
  traversal과 adapter-reported arbitrary entry path를 사용하며
  `fast-glob`/core framework detector를 제거했다.
- 변경: config schema를 `2.0`으로 전환하고 auto/explicit adapter 선택,
  언어 중립 `structure` 설정, v1 in-memory migration diagnostics, strict
  sanitize와 비파괴 저장 계약을 구현했다. settings UI와 project init도 v2를
  round-trip하며 hidden adapter 설정을 보존한다.
- 변경: 기존 870줄 config test를 역할별 test-record로 분리해 rule document
  19 cases와 root resolution 5 cases를 보존했다. 새/변경 test-record는
  각각 5, 7, 25, 12, 5, 19, 5, 13, 14 cases로 모두 32 이하이다.
- 주요 파일: `src/adapters/`, `src/types/{adapters,fractal,scan}.ts`,
  `src/core/tree/`, `src/core/infra/configLoader/`,
  `src/mcp/pages/settings/`, `src/mcp/tools/{openSettings,projectInit}/`,
  `src/__tests__/unit/{adapters,core}/`, `e2e/setup-settings.spec.ts`.
- fail-first:
  - adapter registry test — 신규 entry point 부재로 module resolution 실패.
  - config loader test — v2 계약 전 12 failed / 11 passed.
  - typecheck — adapter/config/tree 신규 public symbol 부재로 실패.
  - 추가 경계 회귀 — empty explicit adapter와 unknown config version 2 cases
    실패 후 동일 파일 25/25 통과.
- 검증:
  - `yarn filid test:run src/__tests__/unit/adapters/adapterRegistry.test.ts`
    — 5/5, exit 0.
  - `yarn filid test:run src/__tests__/unit/core/configLoader.test.ts`
    — 25/25, exit 0.
  - adapter/tree/config scoped 9 files — 105/105, exit 0.
  - `yarn filid typecheck` — exit 0.
  - `yarn filid build:pages` — exit 0; `public/settings.html` 공식 재생성.
  - `filid:scan plugins/filid` — 전체 legacy finding 95건 중 작업 1 대상
    경로 finding 0; 후속 작업에서 제거될 기존 surface finding은 유지.
  - 변경 INTENT 13개 모두 50줄 이하, `git diff --check` exit 0.
- 검증 제한: settings unit 16건은 sandbox에서 모두 `listen EPERM`으로
  시작 전 차단됐다. 비샌드박스 재실행 요청도 승인 시스템 사용 한도로
  거절되어 우회하지 않았다. 최종 완료 전 실제 loopback 환경에서 이 16건과
  `yarn filid test:e2e`를 재실행해야 한다.
- 계획 이탈:
  - 영향받은 기존 tree/settings/projectInit 프랙탈에 누락된 DETAIL.md를
    추가했다. 문서 선행 규칙 충족을 위한 보강이며 제품 계약은 바꾸지 않았다.
  - retired route-pattern UI를 `additionalOrganNames`로 바꾸기 위해 계획
    목록에 없던 `src/mcp/pages/settings/index.html`을 canonical source에서
    수정하고 공식 page build를 실행했다. config v2 목표를 구현한 name-trap
    제거이며 공개 제품 경계 이탈은 아니다.

### 작업 2 — verification-document 15/32 모델

- 변경: 언어 중립 verification 분석·policy·contract group 모델을 추가했다.
  spec-document 15, test-record 32의 파일별 cap, exact/indeterminate/
  unsupported certainty, 무제한 project total, 여러 spec의 DETAIL group
  link와 fragmentation 검사를 구현했다.
- 변경: 초기 ECMAScript verification adapter가 spec/test 역할 탐지, 일반
  case·skip·todo·property, 정적 parameter row와 parameterized suite를
  의미론적으로 계산한다. 동적 table·alias는 PASS가 아닌 indeterminate이며
  `filid:contract`는 주석에서만 추출한다.
- 변경: DETAIL validator가 필수 section과
  `### <stable-id> — <title>` acceptance group을 추출하고 누락·중복을
  거부한다. 기존 “valid DETAIL” characterization fixture도 새 계약으로
  갱신했다.
- 주요 파일: `src/core/verification/`,
  `src/adapters/ecmascript/verification/`,
  `src/types/{verification,documents,adapters}.ts`,
  `src/constants/verificationThresholds.ts`,
  `src/core/rules/documentValidator/acceptanceGroups/`,
  세 verification spec/test와 document validator characterization.
- fail-first:
  - 계획의 두 `.spec.ts` 명령은 최초에 Vitest include에서 제외되어 harness
    실패를 드러냈고, runnable spec 설정 후 각각 신규 verification/core
    entry point 부재로 module resolution 실패했다.
  - adapter registry의 기본 verification adapter assertion은 구현 전
    expected `ecmascript`, received empty로 실패했다.
- 검증:
  - `yarn filid test:run src/core/verification/__tests__/verificationPolicy.spec.ts`
    — 11/11, exit 0.
  - `yarn filid test:run src/adapters/ecmascript/__tests__/verificationAdapter.spec.ts`
    — 7/7, exit 0.
  - verification counting — 14/14, document/hook characterization — 59/59,
    adapter registry — 6/6, 모두 exit 0.
  - 세 verification 파일은 각각 11, 7, 14 cases로 15/15/32 cap 이하다.
  - `yarn filid typecheck`, `git diff --check` — exit 0.
  - `filid:scan` — 새 `verification/` fractal, adapter organ,
    `acceptanceGroups/` organ 모두 finding 0. 기존 documentValidator root의
    legacy peer warning 4건은 그대로이며 새 validator peer warning은 organ
    이동으로 제거했다.
- 계획 이탈:
  - 계획이 지정한 실행 가능한 `.spec.ts`를 실제 harness에 포함하기 위해
    `vitest.config.ts`의 include를 `*.{test,spec}.ts`로 확장했다.
  - 영향받은 documentValidator 프랙탈에 누락된 DETAIL.md를 먼저 추가했다.
  - 계획의 root peer 경로 `validateDetailAcceptanceGroups.ts`는 FCA의 신규
    peer 금지와 충돌해 `acceptanceGroups/` organ 아래로 이동했다. import와
    공개 named export는 유지되어 제품 계약 변화는 없다.
  - 새 DETAIL 계약 때문에 계획 목록 밖의 기존 유효 fixture 2개를 현재
    section/group 형식으로 갱신했다.

### 작업 3 — snapshot, boundary와 실제 DAG

- 변경: adapter 선택, complete tree, dependency/export evidence, verification,
  diagnostics를 한 번에 고정하는 `ProjectSnapshot`을 추가했다. hash는 root와
  mtime에 독립적이며 content와 구조 변화에만 반응하고, 같은 snapshot의 모든
  consumer가 tree와 graph를 재사용한다.
- 변경: target owner부터 root까지의 문서 참조와 가장 가까운 DETAIL,
  diagnostics, output language만 반환하는 read-only context resolver를
  추가했다. 문서 본문과 config는 다시 읽지 않으며 project 밖 target을
  거부한다.
- 변경: built-in roster를 canonical 14개로 고정하고 실제 adapter dependency
  evidence로 graph, import boundary, pure-function isolation, directed closed
  cycle route를 계산한다. incomplete evidence는 빈 PASS 대신 certainty와
  warning finding으로 전파하며, ambiguous adapter claim은 임의 소유하지 않는다.
- 변경: portable owner/containment/relative/identity 계산과 Windows alias
  canonicalization을 `@ogham/cross-platform`으로 구현했다. snapshot의
  `maxDepth`는 traversal 절단이 아니라 검증 한계로 적용해 초과 node도
  진단 대상에 남긴다.
- 주요 파일: `src/core/{projectSnapshot,contextResolver}/`,
  `src/core/analysis/{dependencyGraph,projectAnalyzer}/`,
  `src/core/rules/{ruleEngine,fractalValidator}/`,
  `src/core/verification/`, `src/adapters/{registry,ecmascript}/`,
  `src/types/{adapters,context,fractal,report,rules,scan,verification}.ts`와
  관련 unit/contract tests.
- fail-first:
  - snapshot/context/graph/boundary 신규 계약은 구현 전 module resolution과
    missing symbol로 실패했다.
  - 실제 cycle route·Windows alias graph 3건, rule uncertainty/legacy
    validator 4건, root-independent hash 2건, max-depth completeness 1건,
    adapter single-discovery/override/ambiguity 3건을 각각 실패로 확인했다.
  - verification canonicalization 5건과 Windows scope exemption 1건도
    구현 전 기대한 계약 차이로 실패한 뒤 수정했다.
- 검증:
  - `yarn filid test:run src/core/projectSnapshot/__tests__/projectSnapshot.spec.ts src/core/contextResolver/__tests__/contextResolver.spec.ts`
    — 2 files, 21/21, exit 0.
  - `yarn filid test:run src/__tests__/unit/core/dependencyGraph.test.ts src/__tests__/unit/core/importBoundary.test.ts`
    — 2 files, 28/28, exit 0.
  - snapshot/adapters/tree/analyzer/validator/rules/verification 관련 19 files
    — 214/214, exit 0.
  - `yarn filid typecheck`, tracked/untracked TypeScript Prettier check,
    `git diff --check` — 모두 exit 0.
  - `filid:scan plugins/filid` — 전체 기존 finding 95건 유지, 작업 3 신규
    module scoped finding 0. 변경 INTENT 모두 50줄 이하, spec-document
    15 cases 이하, test-record 32 cases 이하.
- 계획 이탈 및 결정:
  - `resolveContext`의 config 재조회 모순을 없애기 위해 Plan of Record와
    `ProjectSnapshot`에 `outputLanguage`를 추가했다.
  - 공개 경계가 바뀐 기존 `dependencyGraph`, `ruleEngine`,
    `fractalValidator`, `projectAnalyzer`에 누락된 DETAIL.md를 코드보다
    먼저 추가했다.
  - 계획의 단일 `buildDag.ts`는 파일당 공개 함수 하나 규칙과 충돌해
    graph builder와 cycle algorithm을 `builders/`, `cycles/` organ으로
    분리했다. 공개 graph 계약은 유지했다.
  - 초기 adapter가 외부 package reference를 제외하고 반환된 null을
    unresolved local evidence로 정의했다. core의 생태계 중립성을
    유지하기 위한 adapter 계약 명료화다.
  - verification에서도 동률 adapter claim을 제외하기 위해 analyzer 입력을
    보강했다. 공개 verification DTO와 제품 경계 변화는 없다.
  - 사용자 지침에 따라 machine-path 로직을 portable API로 강화하고
    Windows fixture를 추가했다. native path는 실제 현재-host filesystem
    traversal 경계에만 남겼다.
- 커밋: 없음.

### 작업 4 — multi-consumer LCA와 read-only restructure plan

- 변경: 각 consumer의 가장 가까운 owner fractal을 portable path로 해석한 뒤
  전체 ancestor 교집합의 가장 깊은 fractal을 선택하는 true multi-consumer
  LCA를 추가했다. 기존 pairwise compatibility wrapper도 같은 알고리즘에
  위임해 세 consumer에서 잘못된 중간 결과를 제거했다.
- 변경: snapshot evidence만 읽어 source/consumer, contract intent, target
  candidate, required artifact, exact path-like import rewrite를 계산하는
  read-only `RestructurePlan`을 구현했다. 불확실한 contract, 이름, adapter
  entry shape, graph 또는 specifier는 추측하지 않고 unresolved reason으로
  남긴다.
- 변경: precondition은 portable-equivalent root, snapshot hash와 unresolved
  decision을 검사하고 postcondition은 exact source/target, node type,
  문서/adapter entry, import rewrite/boundary, cycle과 graph certainty를
  구조화 finding으로 반환한다. boundary 판정은 기존 rule engine scope를
  재사용한다.
- 변경: 고정 placement/artifact/reason/validation value와 message,
  analysis certainty, rule scope, hash encoding을 module-scope constants가
  소유한다. planner/imports/validator는 leaf organ으로 평탄화하고 한 파일당
  한 exported function으로 분리했다.
- 주요 파일: `src/core/restructure/`,
  `src/core/analysis/lcaCalculator/`,
  `src/constants/{analysisCertainties,nodeTypes,pathMarkers,restructure,ruleScopes}.ts`,
  `src/types/restructure.ts`,
  `src/__tests__/unit/core/lcaCalculator.test.ts`.
- fail-first:
  - LCA 신규 11건은 구현 전 11 failed / 기존 14 passed였고, 세 consumer
    compatibility 기대를 root로 고치자 기존 wrapper가 중간 `/root/a`를
    반환해 1/25가 의미상 실패했다.
  - placement spec은 wiring 실패 뒤 최소 seam에서 10 failed / 1 passed,
    postcondition test-record는 10 failed / 4 passed로 각각 실제 빈 plan과
    무조건 PASS 동작을 드러냈다.
  - 첫 통합 typecheck는 잔여 unused import와 서로 다른 finding code를
    `flatMap`이 과도하게 좁힌 두 오류를 재현했다. `/seiri:trace-cause`로
    원인을 확인하고 DTO 결과 타입 명시 뒤 동일 명령을 재실행했다.
- 검증:
  - `yarn filid test:run src/core/restructure/__tests__/restructurePlacement.spec.ts`
    — 11/11, exit 0.
  - `yarn filid test:run src/core/restructure/__tests__/restructurePostconditions.test.ts`
    — 14/14, exit 0.
  - `yarn filid test:run src/__tests__/unit/core/lcaCalculator.test.ts`
    — 25/25, exit 0.
  - `yarn filid typecheck`, `git diff --check` — exit 0.
  - 마지막 중간 scoped 구조검사 — restructure node 5개, INTENT 47줄과
    3-tier 경계, leaf organ INTENT 0, spec violation 0, test-record 14/32.
    사용자 지침에 따라 이후 전체 구조검사는 모든 개발 후로 연기한다.
- 계획 이탈 및 결정:
  - validation result DTO, `undetermined` target, snapshot entry shape와 exact
    path-like rewrite 한계를 구현 전에 Plan of Record에 명시했다.
  - 계획의 `planner/helpers`, `validator/helpers`는 organ leaf 규칙과
    충돌해 flat function files로 바꾸고 원장·DETAIL·INTENT를 먼저 갱신했다.
  - parent `analysis/INTENT.md`를 LCA 공개 책임에 맞게 보강하고 Task 5 삭제
    예정이던 legacy `getModulePlacement`를 characterization seam을 위해 한
    작업 일찍 새 LCA에 위임했다.
  - snapshot에 per-source content fingerprint가 없어 postcondition은 exact
    target 존재/source 부재를 증명하지만 이동 내용 동일성까지 증명하지 않는다.
    현재 공개 DTO와 AC-12 범위에는 영향이 없다.
- 커밋: 전체 개발 완료 후 review seam별로 생성 예정.

### 작업 5 — artifact envelope와 정확히 9개 MCP tool

- fail-first:
  - `yarn filid test:run src/mcp/server/__tests__/toolEnvelope.spec.ts`
    — 1 suite failed, 0 tests collected, exit 1. 새 공개 계약
    `constants/toolEnvelope.js`가 존재하지 않아 module resolution에서
    실패했으며, 구현 전 envelope API 부재를 확인했다.
  - `yarn filid test:run src/__tests__/integration/vnextToolSurface.test.ts`
    — 3/3 failed, exit 1. 독립적인 9-name oracle에 대해 실제 registry와
    `McpToolName`이 모두 legacy 19개를 노출하고 제거 대상도 등록함을
    의미상 실패로 확인했다.
  - 기존 handler characterization 6-path run은 실제 존재하는 5 files에서
    28 passed, 5 failed, 2 skipped였다. `openSettings` 4건의 `listen EPERM`
    은 sandbox 외 동일 명령에서 4/4 통과해 환경 제약으로 확정했다.
    `fractalScan` 1건은 별도 재현 로그
    `/private/tmp/filid-fractal-scan-trace.log`에서 v1 key migration 후
    `config.structure.additionalOrganNames`가 되었지만 legacy handler가
    top-level `additional-organ-names`를 읽는 최초 오류로 추적했다.
    snapshot-backed Task 5 handler에서 같은 characterization으로 수정한다.
- 구조검사 정책:
  - 사용자 지침에 따라 전체 Filid 구조검사는 개발·상수/함수/FCA
    리팩터링이 모두 끝난 최종 검증 단계에서만 실행한다. 작업 5부터는
    scoped test, typecheck, build만 중간 gate로 사용한다.
- 구현:
  - 공통 `ToolPayload`/`ToolResultEnvelope`, exact 9-name registry,
    snapshot-backed scan/context/plan/validate/verification handler와
    review-state lifecycle을 구현했다.
  - artifact/inline/hash/byte budget은 하나의 compact serializer를 사용한다.
    16 KiB를 넘는 full payload는 symlink-safe plugin cache에 atomic write하며,
    실제 reduced envelope를 다시 측정해 oversized diagnostics를 bounded
    diagnostic으로 바꾼다. summary+metadata 자체가 예산을 넘으면 작은
    structured error로 닫는다.
  - `restructure_plan` artifact는 full payload의 `data`를 canonical plan으로
    읽고 기존 bare-plan artifact도 characterization 호환한다.
  - SDK input 오류는 advertised object schema를 보존한 채 exact schema
    validation을 `wrapHandler` 안에서 수행해 공통 error envelope로 반환한다.
  - `verification_scan` summary는 spec-document/test-record의 file/case
    count와 15/32 cap, fragmentation count를 분리한다.
  - unresolved rule-document plugin root는 `unsupported`와 안정 diagnostic을
    반환하고, root의 9개 공개 handler는 모두 envelope 의미를 갖는다.
  - review-state는 NUL-safe Git tree hash, collision-safe branch key,
    symlink guard, exact-branch cleanup과 fresh/force stale artifact 제거를
    수행한다.
- 추가 fail-first/adversarial 증거:
  - 실제 full-payload plan reader, Map/Set artifact parity, 실제 response
    16 KiB 상한, oversized summary, artifact symlink 탈출의 5개 case가
    구현 전 의도한 이유로 실패했다.
  - actual MCP client의 invalid input, tools/list object schema, first-three
    public adapter와 unresolved rule-doc 상태에서 7개 case가 실패했다.
  - role-aware verification summary가 기존 flat DTO에서 1/1 실패했다.
  - fresh review의 stale report 재사용과 state/report symlink mutation을
    각각 RED로 확인한 뒤 lifecycle guard로 닫았다.
- 주요 파일:
  - `src/core/infra/artifactStore/`, `src/constants/toolEnvelope.ts`,
    `src/types/toolEnvelope.ts`
  - `src/mcp/server/`, `src/mcp/tools/{contextResolve,restructurePlan,
    verificationScan,reviewState}/`
  - `src/mcp/tools/{fractalScan,structureValidate}/`,
    `src/constants/{mcpContracts,reviewState}.ts`, `src/types/report.ts`
- scoped verification:
  - `yarn filid test:run src/mcp/server/__tests__/toolEnvelope.spec.ts
    src/mcp/server/__tests__/legacyToolPayloads.test.ts
    src/__tests__/integration/vnextToolSurface.test.ts
    src/__tests__/unit/mcp/vnextSnapshotTools.test.ts
    src/__tests__/unit/mcp/verificationScanSummary.test.ts
    src/__tests__/unit/mcp/reviewStateLifecycle.test.ts
    src/__tests__/unit/mcp/reviewStateCache.test.ts
    src/__tests__/unit/mcp/reviewStateHash.test.ts
    src/__tests__/unit/mcp/toolResult.test.ts
    src/__tests__/unit/mcp/fractalScan.test.ts`
    — 10 files, 90/90 passed, exit 0.
  - `yarn filid typecheck` — exit 0.
  - `git diff --check -- plugins/filid .metadata/filid` — exit 0.
  - 새 `toolEnvelope.spec.ts`는 15 cases, 모든 새 test-record는 파일당
    32 cases 이하임을 확인했다.
- 계획 이탈:
  - 독립 adversarial review에서 드러난 contract 공백을 Plan of Record에
    먼저 보강했다: 공용 serializer, reduced-envelope hard budget,
    symlink guard, exact-schema wrapper, full-payload plan reader, role-aware
    verification summary, unresolved rule-doc status. 목표 제품 경계나 9-tool
    표면은 바꾸지 않았다.
- 상태: 완료.

### 작업 6 — hook 수명주기 축소와 legacy criteria 진단

- fail-first:
  - hook/runtime 관련 6 files, 80 tests에서 제거 대상 spike·criteria 동작을
    요구하는 10개 실패를 확인했다.
  - portable visited-path resolver는 구현 전 missing export로 실패했다.
  - hook bundle characterization은 기존 `SubagentStart` 등록과 stale
    `agent-enforcer.mjs` 때문에 2개 실패했다.
  - legacy criteria ledger의 absent/present/content-hash 3개 case는 각각
    `undefined`, evidence 부재, hash 불변으로 실패했다.
- 변경:
  - canonical hook을 `SessionStart`, `UserPromptSubmit`, `PreToolUse` 세
    수명주기로 축소하고 agent-enforcer, spike branch 면제·banner·Git helper,
    criteria 전용 deny/audit와 mode-audit cache를 제거했다.
  - INTENT/DETAIL write gate와 visit delivery cache는 유지하고,
    `processVisit(input)` 단일 계약 및 POSIX/Windows portable visited-path
    해석을 적용했다.
  - pre-tool validator를 flat organ의 단일 exported function 파일들로
    분리했다.
  - 공식 hook builder가 세 hook과 shared runner만 생성하고 stale agent
    bundle을 제거하도록 바꿨다. root 생성 산출물은 손으로 편집하지 않았다.
  - `.filid/criteria.md`는 hook deny가 아니라 snapshot evidence와
    project-granularity `legacy-criteria-ledger` warning으로 보고한다.
    ledger bytes는 root/mtime 독립 snapshot hash에 포함되며 root DETAIL로의
    migration suggestion을 제공한다. canonical built-in roster는 15개다.
- 주요 파일:
  - `hooks/hooks.json`, `scripts/buildHooks.mjs`, `templates/hooks/README.md`
  - `src/hooks/{preToolUse,shared,userPromptSubmit}/`
  - `src/core/projectSnapshot/`,
    `src/core/rules/ruleEngine/utils/checkLegacyCriteriaLedger.ts`
  - `src/constants/{hookContext,legacyCriteriaLedger,pathMarkers}.ts`
  - 관련 hook/snapshot/rule unit·integration·benchmark fixtures.
- scoped verification:
  - core/hook/snapshot/rule 결합 15 files — 170/170 passed, exit 0.
  - portable path/write-gate/user-prompt 4 files — 21/21 passed, exit 0.
  - hook runtime agent seam — 17 files, 173/173 passed, exit 0.
  - legacy criteria projectSnapshot/ruleEngine — 7 files, 75/75 passed,
    exit 0.
  - `yarn filid typecheck` — exit 0.
  - `yarn filid build:hooks` — 세 hook, shared runner, isolation guard 통과.
  - `yarn filid test:run src/__tests__/integration/hookBundles.test.ts`
    — 5/5 passed, exit 0.
  - production source에서 제거 대상 criteria/spike/agent symbol을 찾는
    corrected `rg` — 0 matches. 첫 검색은 의도적인 absence assertion 두
    건을 test에서 찾아 exit 1이었으므로 `/seiri:trace-cause`로 scope
    false positive임을 확인하고 production-only 검색으로 교정했다.
  - affected INTENT는 모두 50줄 이하, 새 spec/test-record는 15/32 cap
    이하, `git diff --check -- plugins/filid .metadata/filid` exit 0.
- 계획 이탈 및 결정:
  - 공개 snapshot DTO에 `legacyCriteriaLedger` evidence와 hash 의미를,
    built-in roster에 legacy ledger rule을 구현 전에 Plan of Record에
    보강했다.
  - pre-tool validator helper는 organ 규칙에 따라 중첩 helper 디렉터리
    대신 flat 단일 함수 파일로 구성했다.
  - cross-platform aggregate barrel은 generated hook build graph가 허용하지
    않아 필요한 portable leaf export를 직접 import했다.
  - 사용자 지침에 따라 전체 Filid 구조검사는 실행하지 않았으며 모든
    구현과 전역 리팩터링이 끝난 최종 단계로 연기했다.
- 상태: 완료.

## 최종 Acceptance Criteria

AC-01부터 AC-20까지의 증거는 작업별 기록과 최종 검증 기록에 연결한다.
