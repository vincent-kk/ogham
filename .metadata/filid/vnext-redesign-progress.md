# Filid vNext 재설계 — 진행 원장

> 계획 원장: [`vnext-redesign-plan.md`](./vnext-redesign-plan.md)
>
> 작업 브랜치: `filid/issue-101`
>
> 시작일: 2026-07-26

대화 기억보다 이 문서, 계획 원장, 실제 Git diff를 우선한다. 작업 0부터 9까지
순서대로 닫으며, scoped verification이 통과하기 전에는 완료로 기록하지 않는다.

## 현재 상태

- 진행 중: 작업 10(감사·최종 검증)의 잔여 finding 분류
- 완료: 작업 0–9, 작업 11, 작업 12
- **계획 개정 (2026-07-28)**: 소유자 판단으로 merge-track 절차
  `pull-request` → `cross-review` → `resolve` → `revalidate`와 이를 잇는
  `pipeline`을 필수 부속으로 되살린다. 유지 스킬 8 → **12**, AC-19 갱신,
  AC-21~24 추가. 작업 7이 제거한 네 스킬은 제거된 도구에 의존하므로 복원이
  아니라 9개 도구 위로 재작성한다(작업 11). `resolve`는 자체 코드작성
  에이전트를 잃고 **결정과 기록이라는 절차만** 소유하며, 적용은 메인
  에이전트나 다른 플러그인에 위임한다.
  `promote`·`harvest`·`sync`·`update`·`config-wizard`·`structure-review`·
  `ast-fallback`은 제거 유지하되 계획 원장에 각각의 사유를 명시했다.
- 검증 정책 변경: 중간 gate에 전체 `yarn filid test:run`(약 30초)을 추가한다.
  컨텍스트 비용이 실제로 드는 전체 Filid 구조검사만 작업 10으로 미룬다.
  이전 정책이 전체 스위트까지 유예한 결과, 작업 7이 만든 회귀를 포함해
  12건이 RED인 채로 8개 seam이 커밋됐다 — 아래 「선행 정리」 참조.
- 후속 완료 조건: 작업 9 뒤 전역 상수·함수 경계·FCA 적합성 리팩터링,
  독립 plugin 리뷰, AC 문서 대조 검증과 review seam별 로컬 커밋
- 계획 이탈: 작업 1의 FCA 문서 보강/settings field rename과 작업 2의
  runnable spec 설정/acceptance validator organ 이동, 작업 3의 snapshot
  output-language 계약·내부 helper organ 보완, 작업 4의 flat organ helper
  배치와 compatibility wrapper 조기 전환, 작업 8의 legacy 테스트 동반 삭제
- 해소됨(2026-07-28): 작업 1부터 대기 상태였던 **loopback settings unit 16건이
  통과했다** — `yarn filid test:run src/mcp/tools/openSettings`, 2 files 16/16,
  exit 0. 이전 세션의 `listen EPERM`은 환경 제약이었고 코드 결함이 아니었음이
  확인됐다. `persistSave → writeConfig`(v2 strict schema)와
  `buildSettingsState → loadConfig`(`adapters`·`structure` 판독) 경로가
  동작하므로 AC-24(`config-wizard` 없이 config 관리 완결)의 단위 근거가 섰다.
- 해소됨(2026-07-28): `yarn filid test:e2e`를 처음 실행했다 — 6 passed / 2 skipped, exit 0.
- 작업 10 이월: `initProject(projectRoot, options?: string |
InitProjectOptions)`의 문자열 호환 shim 제거 (저장소 규칙 — 리팩터 완료
  후 호환 shim 제거)

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

### 작업 7 — 스킬과 cross-review를 FCA 범위로 재작성

이 항목은 커밋 `d8359df8`이 만들어진 세션에서 기록되지 못했고, 후속 세션이
커밋과 저장소 상태를 근거로 사후 재구성했다. 아래 검증은 재구성 시점에
직접 실행한 결과다.

- 변경: `agents/` 14개 persona 파일과 legacy 스킬 12개(`ast-fallback`,
  `config-wizard`, `harvest`, `pipeline`, `promote`, `pull-request`,
  `resolve`, `revalidate`, `structure-review`, `sync`, `update`)를 제거하고
  cross-review를 contract·structure·verification 세 관점과 adversarial
  판정 계약으로 전면 재작성했다. `reviewPipeline`/`syncPipeline` 통합
  테스트도 함께 삭제했다. 77 files, +2014 / −7299.
- 주요 파일: `skills/` 8개 workflow,
  `skills/cross-review/{SKILL.md,contracts.md,phases/evidence.md,
reference.md,templates.md}`,
  `skills/cross-review/reviewers/{contract,structure,verification,
adversarial}.md`,
  `skills/cross-review/calibration/contract-change.md`.
- 사후 검증:
  - `find skills -mindepth 1 -maxdepth 1 -type d | wc -l` — 8.
  - `agents/` 부재 확인.
  - 금지 토큰 `rg`(제거 도구 12종 + `code-surgeon`/`criteria.md`/`3+12`/
    `LCOM4`/`cyclomatic`) — `skills/`에서 매치 0.
  - `skills/cross-review/reviewers/` 4개 파일 존재.
- 미검출 회귀: 이 작업의 검증 명령에 테스트 실행이 없어
  `src/__tests__/unit/docsLanguage.test.ts`가 삭제된 `agents/*.md`를
  계속 읽는 3건을 놓쳤다. 선행 정리에서 닫았다.
- 상태: 완료.

### 선행 정리 — 원장 정정과 RED 3파일

작업 8 재개 전에 저장소를 green으로 되돌리고 원장을 실제 상태에 맞췄다.

- fail-first(이미 관측된 실패): 재개 시점 `yarn filid test:run`은
  12 failed / 1324 passed / 3 files, exit 1이었다.
  - `docsLanguage.test.ts` 3건 — `ENOENT .../agents/qa-reviewer.md`,
    `agents/knowledge-manager.md`. 작업 7 회귀.
  - `configPatchValidate.test.ts` 8건 — config v2 이후 계약 불일치.
    이 브랜치에서 한 번도 수정되지 않았고 작업 8 삭제 대상이다.
  - `src/core/infra/configLoader/__tests__/configLoader.test.ts` 1건 —
    `createDefaultConfig` 키 순서에 v2의 `adapters` 미반영. 작업 1이
    검증한 파일은 같은 이름의 `src/__tests__/unit/core/configLoader.test.ts`
    로, 동명 파일 name trap이 scoped 검증을 빗나가게 했다.
- 변경: `docsLanguage.test.ts`의 `SCOPE`/`GUIDE_SCOPE`에서 `agents/` 항목을
  제거하고, 대상이 모두 사라진 whitelist case는 삭제했다. 남은 두 scope는
  각각 실재하는 4개 파일을 검사한다. 콜로케이트 `configLoader.test.ts`는
  기대 키 순서를 `['version','language','adapters','rules']`로 고치고 이제
  거짓이 된 case 이름(`orders language between version and rules`)도 함께
  바꿨다.
- 검증: `yarn filid test:run src/__tests__/unit/docsLanguage.test.ts
src/core/infra/configLoader/__tests__/configLoader.test.ts`
  — 2 files, 8/8, exit 0.
- 이월: `configPatchValidate.test.ts` 8건은 작업 8이 도구와 함께 삭제한다.

### 작업 8 — stale source와 npm library 표면 제거

- 변경: 계획의 삭제 목록을 수행해 `src/{ast,compress,metrics}`,
  `core/{module,prSummary,coverageVerify,rules/driftDetector,
analysis/projectAnalyzer,infra/{changeQueue,projectHash}}`,
  `hooks/changeTracker`, legacy MCP tool 14개 디렉터리, 대응 types·constants
  ·테스트를 제거했다. `src/index.ts` npm barrel과 `tsconfig.build.json`도
  삭제해 MCP·hook entry만 build 대상으로 남겼다. 총 294개 파일 삭제.
- 변경: `core/`, `core/infra/`, `core/rules/`, `hooks/`, `types/`,
  `lcaCalculator` 배럴에서 사라진 심볼을 제거하고, 같은 모듈의 INTENT.md
  Structure 표에서도 `projectHash`·`changeQueue`·`driftDetector`·
  `changeTracker` 행을 지웠다. `types/report.ts`의 drift 의존
  `DriftReport`/`AnalysisReport`/`AnalyzeOptions`/`RenderedReport`도 함께
  제거했다.
- 변경: `isExempt.ts`의 유일한 `fast-glob` 사용처(`fg.isDynamicPattern`)를
  `src/lib/isDynamicGlob.ts`로 대체했다. magic 집합을 `globToRegexp.ts`가
  실제로 확장하는 `**`/`*`/`?`로 한정해도, 그 밖의 문자는 어차피 리터럴로
  escape되므로 두 경로의 매칭 결과는 동일하다.
- 변경: package는 `private: true`, `exports`/`main`/`types`와 `files`의
  `dist`·`agents` 제거, `build:compile` 단계 제거, `@ast-grep/napi`와
  `fast-glob` dependency 제거, 0.8.4 → **1.0.0**. MCP build에서 global
  `NODE_PATH` banner와 native external 설정도 제거했다.
- 계획 이탈:
  - 계획에 없던 `src/__tests__/integration/reviewCache.test.ts`를 함께
    삭제했다. 유일한 대상 `handleReviewManage`가 사라졌고, 작업 5의
    `reviewState*` lifecycle 테스트가 대체 커버리지다.
  - `lcaCalculator.test.ts`에서 `findLCA`/`getModulePlacement` describe
    11건을 제거하는 대신, 두 describe가 갖고 있던 "서로 다른 branch의
    소비자 → root" 동작을 `findLowestCommonFractal`의 신규 case로 옮겼다.
    커버리지를 버리지 않기 위한 병합이며 파일은 25 → 15 cases다.
  - `plugins/filid/CLAUDE.md`의 Anti-Yield Discipline 절을 삭제했다. 참조
    대상 `skills/pipeline/SKILL.md`와 `.omc/research/terminal-markers.json`
    이 작업 7에서 사라졌고, 남은 8개 스킬에 EXECUTION MODEL / DO NOT STOP /
    `[INTERACTIVE]` 마커가 하나도 없음을 `rg`로 확인했다.
- 검증:
  - `yarn filid typecheck` — exit 0.
  - `yarn filid test:run` — 78 files, 805 passed / 7 skipped, exit 0.
  - `yarn filid build` — exit 0. hook bundle guard(session-start ≤ 49152,
    heavy ≤ 32768, light ≤ 16384, 금지 모듈 없음) 통과.
  - `yarn typecheck`(모노레포 `tsc -b`) — 14 workspaces clean, exit 0.
  - `yarn filid test:run src/__tests__/unit/core/isExempt.test.ts
src/__tests__/unit/core/cacheManager.test.ts` — 29/29, exit 0.
    `isExempt` 테스트를 **무수정**으로 통과시켜 fast-glob 제거가
    동작 보존 리팩터임을 특성화했다.
  - `yarn why` — `@ast-grep/napi`는 `@ogham/imbas`, `fast-glob`은
    `@ogham/maencof`와 `globby` 경유만 남고 Filid dependency edge는 없다.
    lockfile에 두 패키지가 남는 이유가 이것이다.
- rg gate 잔여 매치와 사유:
  - `README.md` · `README-ko_kr.md` — 작업 9에서 갱신한다.
  - `scripts/buildHooks.mjs` 2건 — 금지 모듈 guard 자체와 그 주석.
    이름을 지우면 guard가 사라진다.
  - `DETAIL.md`, `src/adapters/INTENT.md`,
    `src/adapters/ecmascript/INTENT.md`,
    `src/core/tree/fractalTree/DETAIL.md` 4건 — "의존하지 않는다"를
    선언하는 경계·수용 기준 문장이다. 금지 대상을 명시하는 것이 문장의
    목적이므로 유지한다.
- 상태: 완료.

### 작업 9 — 생성물과 사용자 문서를 실제 1.0 상태로 동기화

- 변경(생성물): `yarn filid build`와 `yarn plugin:adapters`로 재생성했다.
  plugin-compiler에 prune 단계가 없어 삭제된 스킬 11개
  (`ast-fallback`, `config-wizard`, `harvest`, `pipeline`, `promote`,
  `pull-request`, `resolve`, `revalidate`, `structure-review`, `sync`,
  `update`)의 `.codex-plugin/skills/` 생성물이 고아로 남아 있었다. 해당
  디렉터리만 제거한 뒤 sync를 재실행해 8개 스킬 + `_shared`로 수렴시켰다.
- 변경(사용자 문서): `README.md`와 `README-ko_kr.md`를 1.0 표면으로 다시 썼다.
  9개 MCP 도구, 8개 스킬, 15개 규칙, 훅 3개, native 의존 없음, 16 KiB envelope를
  반영하고 제거된 스킬·도구·메트릭 서술을 걷어냈다.
- 변경(기술 문서): `.metadata/filid/01`–`08` 여덟 문서를 전부 재작성했다.
  기존 문서는 v0.8.x 스냅샷으로 `ast/`, `metrics/`, `compress/`, 페르소나 위원회,
  의사결정 트리, 압축 메커니즘, npm 라이브러리 표면처럼 **더는 존재하지 않는
  구조**를 서술하고 있었다.
  - `01-ARCHITECTURE` — 책임 4가지·비목표·Seiri 경계표, 실제 `core → adapters`
    의존 방향, ADR 10개(native parser 제거, 어댑터 격리, read-only restructure,
    단일 snapshot, DETAIL 단일 원장, 15/32, envelope, 품질규칙 비소유,
    private plugin, 3관점 cross-review)
  - `02-BLUEPRINT` — 13개 모듈군의 목적·알고리즘·공개 시그니처와 데이터 흐름
  - `03-LIFECYCLE` — 8개 스킬 워크플로, cross-review 5단계, review state 수명주기,
    훅 타임라인
  - `04-USAGE` — 설치·빌드 파이프라인(`build:compile` 없음), config v2 전체 스키마,
    hooks.json 실제 내용, 도구 호출 예시, 트러블슈팅(게이트 재시도·훅 캡 포함)
  - `05-COST-ANALYSIS` — 빌드 산출물 **실측** 크기와 바이트 캡·사용률.
    지연 시간(ms)은 이 개정에서 재측정하지 않았으므로 싣지 않고, 필요 시
    `yarn filid bench:run`으로 측정하라고 명시했다.
  - `06-HOW-IT-WORKS` — 훅 파이프라인과 gate 재시도 계약, lexical scanner,
    snapshot/hash, 그래프·cycle, LCA·계획, 검증 계산, envelope 축소 경로
  - `07-RULES-REFERENCE` — 1.0 상수표, 15개 rule의 category/severity/scope/
    granularity, 분류 7단계, 제거된 규칙과 사유
  - `08-API-SURFACE` — npm 표면이 없어졌음을 명시하고 9개 도구 계약과 core DTO로
    재구성
- 검증:
  - `yarn filid build` — exit 0. hook bundle guard 통과, `sync: 5 unchanged`.
  - `yarn plugin:adapters:check` — `sync: 254 unchanged`, stale 0.
  - `.codex-plugin/skills` — 8개 스킬 + `_shared`.
  - 문서 잔여 stale 토큰 `rg` — 매치는 전부 "1.0에서 제거된 도구/규칙" 표와
    "filid가 소유하지 않는 것" 문장이다. 제거 대상을 명시하는 것이 그 문장의
    목적이므로 유지한다.
- 계획 이탈:
  - 계획은 생성물을 "생성 명령으로만 갱신"하라고 하지만, plugin-compiler는
    파일을 만들고 갱신할 뿐 삭제하지 않는다. 소스가 사라진 생성물을 지우는 것은
    손편집이 아니라 고아 제거로 판단해 수행했다. **plugin-compiler에 prune 단계가
    없다는 점은 6개 플러그인 공통 문제이므로 별도 과제로 남긴다.**
  - `plugins/filid/CLAUDE.md`의 Anti-Yield Discipline 절 제거는 작업 8에 기록했다.
- 상태: 완료.

### 작업 10 — 전역 감사와 최종 검증 (진행 중)

#### 완료: 호환 shim과 고아 코드 제거

- `initProject(projectRoot, options?: string | InitProjectOptions)`의 문자열
  분기를 제거했다. 유일한 문자열 호출자는 콜로케이트 legacy 테스트였고,
  production 호출자(`projectInit.ts`)는 이미 객체 형태였다.
- `configSchemas.ts`의 `AllowedEntrySchema` / `AllowedEntry`와 `FilidConfig`
  transitional alias 5키(`additional-allowed`, `additional-entry-points`,
  `additional-route-patterns`, `additional-organ-names`, `scan`)를 제거했다.
  v1 migration이 `additional-allowed` 문자열을 `AllowedPeerOverride`로
  정규화하고 v2 스키마가 객체만 받으므로, `checkZeroPeerFile`의 문자열 분기는
  **도달 불가능한 죽은 코드**였다.
- 이 제거가 `src/core/infra/configLoader/utils/routePatternSanitize.ts`를
  드러냈다 — 소비자 0개의 완전 고아이며 v2에서 폐기된
  `additional-route-patterns`만 다루고 있었다. alias 타입이 유일하게 이것을
  컴파일 가능하게 유지하고 있었다. 파일을 삭제했다.
- `ruleEngineExempt.test.ts`의 "bare string entries" case는 v1 호환 경로를
  검증하고 있었다. 대상이 사라졌으므로 `paths` 없는 객체 entry가 모든 경계에서
  허용되는지를 검증하도록 바꿨다 — 살아 있는 동작의 커버리지는 보존했다.
- 검증: `yarn filid typecheck` exit 0, `yarn filid test:run`
  78 files / 805 passed / 7 skipped, exit 0.

#### 완료: 전체 Filid 구조검사 1회

세션에 로드된 MCP 서버는 재빌드 이전 번들이므로, **방금 빌드한
`bridge/mcp-server.cjs`를 직접 stdio로 구동**해 검사했다
(`scanSelf.mjs`, scratchpad).

- `tools/list` — **정확히 9개**. `context_resolve, fractal_scan, open_settings,
project_init, restructure_plan, review_state, rule_docs_sync,
structure_validate, verification_scan`. AC-19의 도구 절반을 실제 번들에서 확인.
- `structure_validate(mode: project)` — status `indeterminate`,
  passed 1143 / failed 72 / findingCount **832**, 299,599 byte artifact.
- `verification_scan` — 80 files (spec 9 / 83 cases, test-record 71 / 736 cases),
  fragmentation 0, violationCount 4, certainty `indeterminate`.

규칙별 집계:

| 건수 | rule                       | severity            |
| ---- | -------------------------- | ------------------- |
| 707  | `external-import-boundary` | error               |
| 59   | `zero-peer-file`           | warning             |
| 22   | `entry-point-surface`      | warning             |
| 20   | `detail-document-contract` | error               |
| 9    | `module-entry-point`       | warning             |
| 5    | `intent-document-contract` | error               |
| 3    | `spec-contract-link`       | error               |
| 3    | `circular-dependency`      | error 2 / warning 1 |
| 3    | case-cap · fragmentation   | warning             |

#### 미완료: finding 분류와 잔여 검증

아래는 사용자 판단이 필요하거나 별도 분량의 작업이다.

1. **cycle 2건** — 추적 결과 **런타임 순환이 아니라 owner 승격 인공물**이다.
   - `src/hooks -> src/hooks/preToolUse -> src/hooks` — 확인 완료.
     `src/hooks/index.ts`(부모 배럴)가 `preToolUse`를 재수출하고,
     `preToolUse.ts`는 `../shared/shared.js`와 `../utils/validateCwd.js`를
     import한다. 두 organ은 `src/hooks` 소유이므로 `preToolUse -> src/hooks`
     edge가 생기고, 배럴이 반대 방향 edge를 만든다. `preToolUse`는
     `hooks/index.ts`를 import하지 않는다.
   - `src -> src/core/rules/documentValidator -> src` — 같은 형태로 보인다.
     documentValidator가 `src/constants/` organ(= `src` 소유)을 참조하는 쪽은
     확인했고, 반대 방향 edge의 출처는 미확정이다.
   - **판단 필요**: organ 참조가 부모 fractal로 승격되는 현재 규칙은
     "부모 배럴 + 부모 organ" 이라는 정상적인 FCA 형태를 순환으로 판정한다.
     owner 승격을 바꿀지, organ edge를 cycle 계산에서 제외할지, 배럴 edge를
     제외할지는 규칙 설계 결정이다.
2. **`external-import-boundary` 707건의 성격** — 소비자 분포는
   `src/core` 281 · `src/__tests__` 182 · `src/mcp` 140 · `src/hooks` 93 ·
   `src/adapters` 9다. 대표 메시지는
   `Import "../src/constants/builtinRuleIds.js" bypasses the target module
boundary`. 즉 상당수가 **organ(`constants/`, `types/`) 직접 import**,
   **테스트의 내부 import**, 그리고 **저장소가 명시적으로 요구하는 훅 직접
   import 예외**다. 707개 import를 고치는 문제가 아니라 규칙·config 보정
   문제로 보인다 — 판단이 필요하다.
3. **`.filid/config.json`이 아직 v1이다.** 스캔이
   `config-migration-required`와 discarded key 3건
   (`rules.naming-convention`, `rules.index-barrel-pattern`,
   `additional-route-patterns`)을 보고했다. 저장소가 자기 제품의 v2를
   dogfooding하지 않고 있다.
4. **`spec-contract-link` 3건** — `src/core/projectSnapshot`의 spec 3개가
   DETAIL acceptance group을 선언해야 한다. 실제로 고칠 수 있는 finding이다.
5. **`indeterminate` 원인** — `legacyToolPayloads.test.ts`의 dynamic table
   parameterized case 1건이 프로젝트 전체 certainty를 끌어내린다.
6. **독립 review 2개** — 계획이 요구하지만 subagent 실행은 사용자 승인이
   필요하다.
7. **`yarn filid test:e2e`** — Playwright 미실행. loopback settings unit 16건과
   함께 여전히 최종 검증 대기 상태다.
8. **커밋** — 계획대로 최종 검증 통과 후 review seam별로 생성한다. 현재
   미커밋.

### 작업 11 — merge-track 5스킬을 9개 도구 위로 재작성

- 생성: `skills/{pull-request,resolve,revalidate,pipeline}/{SKILL.md,reference.md}` 8개 파일. `git checkout` 복원이 아니라 재작성이다 — 네 스킬 모두 제거된 도구에 걸려 있었다(`review_manage`, `debt_manage`, `ast_analyze`, `test_metrics`, `code-surgeon` 에이전트, `filid:update`/`harvest`/`promote`/`structure-review` 스킬).
- `resolve`의 역할 변경을 계약으로 명시했다. 코드를 쓰지 않고 delegation brief(경로·규칙·필요 변경·경계)를 만들어 메인 에이전트나 다른 플러그인에 넘긴다. 적용 여부는 `revalidate`의 재측정이 판정하며, 적용되지 않은 수용 항목은 `unapplied`로 **보고되지 숨겨지지 않는다.**
- 거부 기록은 `.filid/review/<branch>/justifications.md` 하나로 통일했다. 커밋되는 부채 원장은 되살리지 않았다. `revalidate`가 각 거부의 Context/Decision/Consequences 3부를 헌법성 규칙으로 판정한다.
- `pull-request` Stage 1은 `enrich-docs`가 담당한다. branch diff에서 `context_resolve`로 변경 프랙탈을 도출해 그 범위만 감사하고, `INTENT.md`/`DETAIL.md`만 stage해 커밋한다. PR 범위와 문서 감사 범위를 일치시킨다.
- 검증:
  - 스킬 12개, 금지 토큰 `rg` 매치 0.
  - `yarn filid build` — exit 0, hook bundle guard 통과.
  - `yarn plugin:adapters:check` — `sync: 254 unchanged`, stale 0.
  - 루트 `INTENT.md` 46줄(50 이하), `skills/` 행을 12개로 갱신.

#### 작업 9의 `.codex-plugin/skills` 조치 정정

작업 9에서 삭제된 스킬 11개의 `.codex-plugin/skills/` 생성물을 "고아"로 보고 개별 삭제해 8개로 수렴시켰다. **이 조치는 틀렸다.**

`buildCodexSkills`의 `emitsCodexSkillVariant`는 (a) 플러그인이 opt-in 목록에 있고, (b) `agentFiles`가 비어 있지 않고, (c) persona spawn을 하는 스킬이 있을 때만 트리를 생성한다. 작업 7이 `agents/`를 지운 뒤로 filid는 (b)와 (c)를 모두 잃었으므로 컴파일러는 이 트리를 **더 이상 만들지도 관리하지도 않는다.** 세 매니페스트(`.claude-plugin/plugin.json`, 루트 `plugin.json`, `.codex-plugin/plugin.json`)가 모두 `"skills": "./skills/"`를 가리키므로 참조하는 곳도 없다.

따라서 올바른 조치는 큐레이션이 아니라 `plugins/filid/.codex-plugin/skills/` 전체 삭제였다. 지금 삭제했고, 재생성되지 않음을 `build:compile-plugin` 재실행으로 확인했다. `.codex-plugin`에는 컴파일러가 실제로 관리하는 `plugin.json`과 `hooks.json`만 남는다.

#### 문서 개행 규칙 정정

저장소 규칙은 하드 랩 없음(문단 = 한 줄)이다 — 원본 `README-ko_kr.md` 최대 275자, 기존 `skills/*/SKILL.md` 177–232자. 작업 9에서 재작성한 `.metadata/filid/01`–`08`과 작업 11의 스킬 8파일을 80칼럼으로 접어 이 규칙을 깼다. scratchpad의 기계적 unwrapper로 산문·리스트·블록인용을 되돌렸고 표·코드펜스·frontmatter는 보존했다. 두 원장(`vnext-redesign-plan.md`, 이 파일)은 이전 세션 내용이 섞여 있어 전체 reflow가 diff를 묻어버리므로 제외했다.

- 상태: 완료.

### 작업 10 후속 — config v2 이관과 finding 원인 규명

- `.filid/config.json`을 실제 마이그레이션 경로(`loadConfig` → `writeConfig`)로 v1 → v2 이관했다. 손으로 쓰지 않고 제품 코드를 dogfooding했다. 진단 3건이 예상대로 나왔다: `rules.naming-convention`, `rules.index-barrel-pattern`, `additional-route-patterns`는 1.0에서 제거된 키이므로 버려졌다. `additional-organ-names` → `structure.additionalOrganNames`, `additional-allowed` → `structure.additionalAllowedPeers`(문자열은 객체로 정규화), `additional-entry-points` → `structure.entryPointOverrides.ecmascript`로 이관됐다.
- 재스캔: findingCount 832, passed 1143 → **1175**, failed 72. 마이그레이션이 의미를 보존하므로 finding 수는 그대로다.

#### 원인 1 — `external-import-boundary` 708건의 대부분은 organ import다

무엇을 뚫었는지로 집계하면 상위 10개가 다음과 같다.

| 건수 | 대상                          | 노드 타입 |
| ---- | ----------------------------- | --------- |
| 83   | `core/infra`                  | fractal   |
| 74   | `types/fractal.js`            | **organ** |
| 33   | `types/rules.js`              | **organ** |
| 31   | `types/hooks.js`              | **organ** |
| 27   | `types/toolEnvelope.js`       | **organ** |
| 24   | `constants/toolEnvelope.js`   | **organ** |
| 23   | `lib/logger.js`               | **organ** |
| 21   | `constants/builtinRuleIds.js` | **organ** |
| 21   | `types/restructure.js`        | **organ** |
| 20   | `constants/reviewState.js`    | **organ** |

**이것은 규칙 간 모순이다.** `module-entry-point`는 organ에 진입점을 요구하지 않는다 — organ은 진입점을 갖지 않는 것이 정의다. 그런데 `external-import-boundary`는 "외부 소비자는 진입점만 참조하라"를 organ에도 적용한다. 존재하지 않는 진입점을 경유하라고 요구하므로 organ의 모든 파일 참조가 자동으로 위반이 된다.

708건 중 organ 대상이 압도적이므로, 이것은 708개 import를 고칠 문제가 아니라 **규칙 의미를 정할 문제다.**

#### 원인 2 — skills 오탐의 정확한 기전

`skills/setup`과 `skills/cross-review` **둘만** INTENT/DETAIL/entry-point finding을 받는다. 나머지 10개 스킬은 받지 않는다.

기전은 세 규칙의 상호작용이다.

1. config가 `skills`를 `additionalOrganNames`로 선언 → 분류 우선순위 2에 의해 `skills`는 organ.
2. config가 `SKILL.md`를 `entryPointOverrides.ecmascript`로 선언 → 각 스킬 디렉터리가 진입점을 가진 것으로 관찰됨.
3. organ 아래 traversal은 계속되고, 진입점을 가진 하위 디렉터리는 독립 fractal로 재분류된다.

그런데 우선순위 5("fractal child 없는 leaf directory → organ")가 먼저 걸리는 스킬은 organ으로 남는다. `setup`(`sections/`)과 `cross-review`(`phases/`, `reviewers/`, `calibration/`)만 하위 디렉터리를 가지므로 leaf가 아니고, 따라서 fractal이 된다.

**결과적으로 "하위 디렉터리가 있는 스킬만 INTENT.md를 요구받는다."** 사용자 관점에서 임의적이며, 이 오탐은 8개 플러그인 전체에서 재현된다.

#### 원인 3 — cycle 2건은 owner 승격 인공물

`src/hooks -> src/hooks/preToolUse -> src/hooks` 확인 완료. 부모 배럴이 자식을 재수출하고, 자식이 부모 소유 organ(`shared/`, `utils/`)을 참조해 생긴 왕복이다. 런타임 순환은 없다. 원인 1과 같은 뿌리다 — organ 참조를 부모 fractal edge로 승격하는 규칙.

### spec 개정 — 분류 기준과 organ 경계 (2026-07-28)

소유자와의 논의로 세 가지가 확정됐고 canonical rule 문서에 반영했다.

1. **분류는 서술이지 규범이 아니다.** 이전 사다리는 "그 밖에는 fractal"을 기본값으로 두어, 아직 FCA가 아닌 코드베이스에서 "INTENT.md를 추가하라"는 요구를 자동 생성했다. 반대로 `INTENT.md ∨ index → fractal`만으로 바꾸면 채택 과정에 눈이 먼다 — 아무것도 fractal이 아니니 `setup`이 제안할 게 없다.

   해법은 두 일을 분리하는 것이다. **분류기**는 파일 존재만 관찰하고(문서 ∨ module index → fractal, 그 밖 organ), **규칙 엔진**이 "소유 subtree 밖에서 소비되는 organ은 외부 경계를 가진 것"이라는 FCA 정의로 누락 fractal을 보고한다. 후자의 증거는 filid가 이미 계산하는 의존성 그래프이며 LCA 배치가 쓰는 증거와 같다.

2. **organ 접근은 소비자 위치로 판정한다.** organ에 "진입점을 경유하라"를 적용한 것이 708건의 원인이었다 — organ은 진입점을 갖지 않는 것이 정의이므로 경유할 대상이 없다. 소유 subtree 안에서는 구체 파일 직접 참조가 정상이고, 밖에서는 소유 프랙탈의 index를 경유한다. 밖에서의 직접 참조는 선언된 면책이 있을 때만 허용된다.

3. **면책과 LCA 미이동 사유는 소유 프랙탈의 DETAIL.md에 조건부로 선언한다.** 보편 문서 계약을 늘리지 않는다 — 면책이 실제로 필요한 프랙탈만 `## Organ Exemptions`를 갖고, DETAIL.md가 없으면 그 목적으로 추가한다. `Reason`이 비면 면책이 아니라 미충족 계약이다.

   직접 import 면책의 표준 사례는 훅 번들이다. 배럴을 import하면 번들러가 배럴이 재수출하는 모듈 전체를 끌어온다.

`SKILL.md`가 진입점에서 빠진 이유도 여기 있다. 스킬과 에이전트는 md 자체가 구현이라 코드용 규칙을 그대로 적용하면 의미가 와전된다.

#### 배포 드리프트 발견

`templates/rules/filid_fca-policy.md`(canonical, 251줄)와 `.claude/rules/filid_fca-policy.md`(배포본, **158줄**)가 달랐다. 작업 0이 원본만 고치고 재배포하지 않아 배포본이 v0.8.x 그대로였고, 이 저장소에서 일하는 에이전트들이 세션 내내 `index-barrel-pattern`·LCOM4·3+12 같은 제거된 규칙을 읽고 있었다.

원본을 320줄로 개정한 뒤 `yarn filid build:rules`로 manifest hash를 갱신하고, 제품 도구 `rule_docs_sync`로 배포해 `inSync: true`를 확인했다(`updated: 1`). **canonical rule 문서 수정은 `build:rules` + `rule_docs_sync`까지가 한 단위다.**

코드 반영은 작업 12로 계획 원장에 기록했다. AC-25~27 추가.

### 작업 12 진행 — 분류 사다리 (1/6 완료)

**fail-first**: `organClassifierClassify.test.ts`에 "describes, never prescribes" 4 케이스를 먼저 추가했다. 3건이 의도한 이유로 실패했고(문서·index 없는 non-leaf → fractal, executable/framework entry → fractal), `module` entry → fractal 1건은 처음부터 통과해 과잉 교정을 막는 대조군이 됐다.

**변경**: `classifyNode`의 5단계를 `kind: 'module'` entry point로 한정하고 기본값을 `fractal` → `organ`으로 뒤집었다. `pure-function`은 논의 밖 동작 변경을 피하려고 leaf 단계를 유지해 기존대로 non-leaf에서만 나온다.

**파급 6건과 처리**:

- `structureGuard` 2건 — 기본값이 organ이 되자 선언 없는 모든 디렉터리에 flatness 경고가 붙었다. `.filid/review/<branch>/` 같은 정상 경로가 매번 걸린다. `isOrganByStructure`를 **선언된 organ**(known name 또는 `__name__`/`.name` 패턴)으로 좁혔다 — 가드 주석이 이미 밝히던 의도("only named code organs keep it")이며, 문서가 있으면 여전히 fractal이다.
- 나머지 4건 — 전부 "config에 없는 이름은 fractal로 남는다"를 대조군으로 쓰던 케이스다. 기본값이 organ이 되면서 **대조 능력을 잃었다**(양쪽 다 organ). 각 fixture에 module index를 주어 판별력을 되살렸다: index가 fractal로 만들고 config 이름이 그것을 덮는다. 기대값만 뒤집으면 아무것도 증명하지 않는 테스트가 됐을 것이다.

**검증**: `yarn filid test:run` 78 files / **809 passed** / 7 skipped, exit 0. `yarn filid typecheck` exit 0.

**자체 재스캔 실측** (`build:mcp` 후 새 번들 구동):

| 지표                       | 이전 | 이후    |
| -------------------------- | ---- | ------- |
| findingCount               | 832  | **707** |
| failed                     | 72   | **54**  |
| passed                     | 1175 | 1193    |
| `intent-document-contract` | 5    | **0**   |
| `detail-document-contract` | 20   | 15      |
| `zero-peer-file`           | 59   | 28      |
| `module-entry-point`       | 9    | 4       |
| `external-import-boundary` | 708  | 630     |
| `circular-dependency`      | 3    | 2       |
| skills 관련 finding        | 10   | **0**   |

skills 오탐이 완전히 사라졌다(AC-25의 스캔 수준 근거). 남은 630건은 대상 3(organ 소비자 위치 판정)이 처리할 몫이며 아직 손대지 않았다.

**남은 대상 5개**: `findEntryPoints`의 kind 분리, `checkExternalImportBoundary`의 organ 판정과 면책, `dependencyGraph`의 organ edge 승격 제외, `documentValidator`의 `Organ Exemptions` 파서, `.filid/config.json`의 `SKILL.md` 제거.

### 작업 12 완료 — organ 경계와 면책 (6/6)

**fail-first**: 네 파일에 12개 케이스를 먼저 추가해 8건이 RED임을 확인했다. `importBoundary.test.ts`의 "소유 subtree 안 organ 직접 참조는 통과" 케이스는 처음에 **공허하게 통과**했다 — fixture에 `/project/left/nested` 노드가 없어 `checkExternalImportBoundary`가 edge를 통째로 건너뛰었기 때문이다. 노드를 추가해 진짜 RED로 만든 뒤 진행했다. 나머지 4건(소유 밖 직접 참조, reason 부재, direct import 미허용, consumer 불일치)과 graph·adapter의 대조군 2건은 처음부터 GREEN이며, 변경 후에도 GREEN이어야 "규칙이 느슨해진 게 아니라 대상이 바뀌었다"가 증명된다.

**변경**:

- `findEntryPoints` — config override를 `kind: 'executable'` / `surface: 'enumerated'`로 보고한다. module index 인식이 먼저 오므로 `index.ts`는 계속 `module`이다. `framework`를 고르지 않은 이유는 계획 원장에 적었다.
- `resolveOwningOrganPath(organPaths, ownerPath, filePath)` — `filePath`를 담으면서 `ownerPath` 안에 있는 가장 깊은 organ. organ이 fractal의 조상일 수도 있으므로 owner 안 containment를 요구한다. `dependencyGraph` 진입점에서 공개해 graph와 rule engine이 같은 판정을 쓴다.
- `buildDependencyGraph(..., { organPaths })` — owned-organ 참조를 edge로는 보존하되 cycle adjacency에서만 뺀다. 삭제하지 않은 이유는 `restructure_plan`이 incoming edge로 소비자를 계산하기 때문이다 — 지우면 LCA 배치가 내부 소비자에 눈이 먼다.
- `checkExternalImportBoundary` — organ 대상이면 소비자 위치로 판정하고, 소유 subtree 밖이면 면책을 조회한다. finding 메시지는 organ 경로와 소유자를 함께 밝히고 세 가지 해소책(fractal 승격 / LCA 이동 / 면책 선언)을 제시한다.
- `parseOrganExemptions` + `isOrganExemptionGranted` — 파서는 `documentValidator/organExemptions/` organ에 두고, consumer 매칭은 기존 `isExempt` glob을 재사용한다. 면책 인정 조건 넷(organ 일치·direct import 허용·consumer 매치·reason 비어있지 않음)은 각각 테스트가 붙어 있다.
- `collectDocumentEvidence` — 선언된 organ path를 소유 프랙탈 기준 절대 경로로 정규화해 `node.documentEvidence.organExemptions`에 보존한다. 이미 hash 입력에 든 필드라 snapshot hash 계약이 자동으로 따라온다.
- `.filid/config.json` — `entryPointOverrides.ecmascript`의 `SKILL.md`를 제거했다. 참고로 이 override는 이미 무효였다 — `findEntryPoints`가 `SOURCE_EXTENSIONS` 필터를 먼저 적용하고 `.md`는 그 목록에 없다. 진행 원장 「원인 2」가 지목한 기전은 실제로는 동작하지 않았고, skills 오탐을 만든 것은 분류 기본값 하나였다.

**검증**: `yarn filid typecheck` exit 0 · `yarn filid test:run` 78 files / **825 passed** / 7 skipped, exit 0 · `yarn filid build` exit 0(훅 번들 가드 통과) · `yarn filid test:e2e` **첫 실행, 6 passed / 2 skipped**(skip 2건은 optional rule이 없을 때 건너뛰도록 파일 상단에 사유가 적힌 조건부 skip) · `yarn plugin:adapters:check` — filid stale 0(보고된 stale 1건은 `plugins/imbas/.codex-plugin/skills/pipeline/references/blocker-report.md`로 이 작업과 무관한 다른 플러그인) · `git diff --check` exit 0 · 최종 `rg` 게이트의 잔여 매치는 전부 "의존하지 않는다" 선언, 제거된 도구 oracle, 훅 번들 가드 자체다.

**자체 재스캔 실측** (`build:mcp` 후 새 번들을 stdio로 직접 구동):

| 지표         | 작업 12 이전 | 분류 사다리 후 | 최종    |
| ------------ | ------------ | -------------- | ------- |
| findingCount | 832          | 707            | **278** |
| passed       | 1175         | 1193           | 1201    |

`passed`는 finding 수가 아니라 rule 평가 횟수라 트리 노드 수에 따라 흔들린다. `test:e2e`를 돌린 뒤 재측정하면 1209인데, Playwright가 만드는 gitignore 대상 `plugins/filid/test-results/`가 노드로 잡히기 때문이다. 위 값은 깨끗한 트리 기준이며 findingCount 278은 양쪽에서 같다.
| `external-import-boundary` | 708 | 630 | **200** |
| `circular-dependency` | 3 | 2 | **1** |
| `zero-peer-file` | 59 | 28 | 28 |
| `entry-point-surface` | 22 | 22 | 22 |
| `detail-document-contract` | 20 | 15 | 15 |
| `module-entry-point` | 9 | 4 | 4 |

**면책 왕복을 실제 데이터로 증명**했다. `ruleEngine/DETAIL.md`에 `## Organ Exemptions`로 `utils` ← `**/src/__tests__/**`를 일시 선언하고 세 번 재스캔했다.

| 상태                    | findingCount | organ 대상 | 비고                                            |
| ----------------------- | ------------ | ---------- | ----------------------------------------------- |
| 선언 없음               | 278          | 17         | 기준선                                          |
| 유효한 선언             | 276          | 15         | 정확히 대상 2건만 통과                          |
| 같은 선언, reason 빈 값 | 279          | 17         | 위반 복귀 + `detail-document-contract` 1건 추가 |

프로브는 되돌렸다. 이 저장소에 남은 organ 위반 17건 중 15건이 `src/__tests__`가 내부 organ을 직접 찌르는 형태인데, 옳은 해소는 면책 선언이 아니라 테스트 콜로케이션이거나 진입점 경유다 — 저장소 소유자 판단이므로 작업 12에서 결정하지 않았다.

**남은 cycle 1건의 원인을 특정했다.** `src -> src/mcp/server -> src`이며 organ 인공물이 **아니다**. `src/mcp/server/createServer.ts`가 `src/version.ts`(= `src`의 root peer)를 import해 `src/mcp/server -> src` edge가 생기고, `src/__tests__/**`(= `src` 소유 organ)가 `src/mcp/server/*`를 import해 반대 방향 edge가 생긴다. `version.ts`는 아무것도 import하지 않으므로 런타임 순환은 없다. 이것은 organ 참조가 아니라 **조상 peer file 참조**의 승격이므로 작업 12의 범위(AC-27) 밖이다. 확장할지는 별도 spec 결정이다.

**프로덕션 boundary 위반 2건은 면책 대상이 아니라 import 오류다.** `ruleEngine/loadBuiltinRules.ts`와 `utils/checkZeroPeerFile.ts`가 `configLoader/loaders/configSchemas.js`에서 `AllowedPeerOverride`를 직접 가져오는데, 같은 심볼이 `configLoader` 진입점에 이미 있다. 규칙이 제 일을 한 것이며 수정은 작업 10의 finding 해소 몫으로 남긴다.

**계획 이탈**:

- `findEntryPoints`의 override kind로 `framework` 대신 `executable`을 골랐다. 계획은 "서로 다른 kind"만 요구하고 어느 것인지는 열어 뒀는데, `framework`는 `surface: 'opaque'`를 파생시켜 정당한 override마다 `entry-point-surface` 경고를 영구적으로 만든다. 계획이 override를 "`entry-point-surface`의 입력"이라고 규정한 것과 모순되므로 enumerated를 보존하는 쪽을 택했다. 사유를 계획 원장과 adapter DETAIL에 적었다.
- `dependencyGraph`에서 organ edge를 제거하지 않고 cycle adjacency에서만 뺐다. 계획 문구는 "부모 fractal edge로 승격하지 않는다"인데, 승격 자체를 없애면 `restructure_plan`의 소비자 계산 증거가 사라진다. 모듈 INTENT가 이미 same-owner edge에 같은 정책을 쓰고 있어 그 형태를 따랐다.
- `ecmascriptStructureAdapter.test.ts`의 기존 케이스 "interprets only exact configured peer names as entry overrides"에서 `kind: 'module'` 기대를 `'executable'`로 바꿨다. 그 케이스의 주제(정확한 이름만 인식)는 그대로이고 kind는 부수 단언이었다. 계약 변경에 따른 갱신이며 green-washing이 아니다.
- 공개 DTO 두 곳을 넓혔다: `DetailMdValidation.organExemptions`와 `FractalDocumentEvidence.organExemptions`. 후자는 `snapshotStructureInput`이 이미 `documentEvidence`를 hash 입력에 넣고 있어 hash 계약이 자동으로 따라온다. `ProjectSnapshot`의 최상위 필드는 늘리지 않았다.

- 상태: 완료.

## 최종 Acceptance Criteria

AC-01부터 AC-24까지의 증거는 작업별 기록과 최종 검증 기록에 연결한다.
