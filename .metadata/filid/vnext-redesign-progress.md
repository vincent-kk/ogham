# Filid vNext 재설계 — 진행 원장

> 계획 원장: [`vnext-redesign-plan.md`](./vnext-redesign-plan.md)
>
> 작업 브랜치: `filid/issue-101`
>
> 시작일: 2026-07-26

대화 기억보다 이 문서, 계획 원장, 실제 Git diff를 우선한다. 작업 0부터 9까지
순서대로 닫으며, scoped verification이 통과하기 전에는 완료로 기록하지 않는다.

## 현재 상태

- 대기: 작업 3 — snapshot, boundary와 실제 DAG 구현 전
- 완료: 작업 0, 작업 1, 작업 2
- 계획 이탈: 작업 1의 FCA 문서 보강/settings field rename과 작업 2의
  runnable spec 설정/acceptance validator organ 이동(제품 경계 변경 없음)
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

## 최종 Acceptance Criteria

AC-01부터 AC-20까지의 증거는 작업별 기록과 최종 검증 기록에 연결한다.
