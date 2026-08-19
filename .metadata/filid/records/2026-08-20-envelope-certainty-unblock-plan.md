# filid 엔벨로프 certainty 정정 및 enrich-docs 해금 — 실행 계획

작성 2026-08-20 · 대상 `plugins/filid` v0.10.9 · 발단 PR #115 `maencof/archive-layer` revalidate FAIL

## 배경 — 검증된 근본 원인

`/filid:pipeline` 실행에서 문서 계약 findings 10건이 `unapplied`로 남아 revalidate가 FAIL했다. 위임 대상 `/filid:enrich-docs`가 전제조건에서 중단됐고, 그 전제조건은 **어떤 스코프에서도 성립할 수 없다**.

`plugins/filid/src/mcp/tools/fractalScan/utils/resolveFractalScanCertainty.ts:22`

```ts
if (
  graphCertainty !== EXACT ||
  verificationCertainty !== EXACT ||
  diagnostics.length > 0
)
  return INDETERMINATE;
```

`resolveFractalScanStatus`가 `INDETERMINATE` certainty를 `status: "indeterminate"`로 매핑한다.

### 측정 증거

| 스코프                                                                                    | graph             | verification  | 진입점 표면 | diagnostics | status        | 트리거                        |
| ----------------------------------------------------------------------------------------- | ----------------- | ------------- | ----------- | ----------- | ------------- | ----------------------------- |
| 프로젝트 루트                                                                             | exact             | indeterminate | —           | 613         | indeterminate | verification 축 + diagnostics |
| `plugins/maencof-lens`                                                                    | exact             | exact         | 24/24 exact | 25          | indeterminate | **diagnostics만**             |
| `plugins/maencof-lens/src/tools/lensStatus` (문서 완비, `documentEvidence.status: valid`) | **indeterminate** | exact         | 1/1 exact   | **0**       | indeterminate | **graph 축만**                |

- `maencof-lens` 아티팩트 전체에서 `indeterminate` 문자열은 `root.status`와 `root.summary.certainty` 단 2곳. 실제로 불확실한 측정은 하나도 없다.
- 프로젝트 스코프 `snapshot.diagnostics` 613건은 **전부** `intent-document-contract`(377) + `detail-document-contract`(236)이며, 비문서 코드 진단은 **0건**이다. 즉 이 조건은 "문서 findings 존재 여부"의 대리 지표로 동작한다.
- `lensStatus`처럼 스코프를 좁혀 diagnostics를 0으로 만들면, 서브트리 밖 import를 해소하지 못해 `dependencyGraph.certainty`가 깨진다.

### 모순 구조

`enrich-docs`는 문서 위반을 고치려 존재하는데, 문서 위반이 있으면 전제조건이 깨진다. 위반을 피하려 스코프를 좁히면 의존성 축이 깨진다. **성립하는 스코프가 없다.**

부수로, `status: "violations"`는 사실상 도달 불가능한 분기다 — `violationCount > 0`이면 문서 규칙 위반이 diagnostics를 채우므로 그 전에 `indeterminate`로 반환된다.

같은 `diagnostics.length > 0` 패턴이 세 evidence 도구 전부에 있다:

- `plugins/filid/src/mcp/tools/fractalScan/utils/resolveFractalScanCertainty.ts:22`
- `plugins/filid/src/mcp/tools/verificationScan/utils/resolveVerificationScanStatus.ts:17`
- `plugins/filid/src/mcp/tools/structureValidate/utils/resolveProjectValidationStatus.ts:19`

### 계약 근거

`plugins/filid/skills/cross-review/contracts.md` → Evidence Identity가 이 구분을 이미 규정한다: "A measured `indeterminate` is finding evidence. Only evidence the adapters could not obtain at all is a gap." 그리고 `violations` = "Evidence is usable and its in-scope findings must be reviewed." 현재 구현은 **usable evidence + findings**를 **unusable evidence**로 잘못 분류한다.

## 전역 제약 — 모든 태스크가 상속

- 모노레포 yarn workspaces · vitest · TypeScript. 대상 패키지 `@ogham/filid` v0.10.9.
- **filid MCP 서버는 빌드 산출물에서 구동된다**: `plugins/filid/mcp_config.json` → `node bridge/mcp-server.cjs`. 소스 수정은 `yarn filid build:mcp` 후 **MCP 서버 재시작**이 있어야 실행 중 세션에 반영된다.
- **filid 스킬 문서는 저장소 트리에서 로드된다**: 스킬 `.md` 수정은 `/reload-plugins`로 반영되며 버전 범프는 필요 없다.
- `bridge/`는 빌드 산출물이므로 손편집 금지 (루트 `CLAUDE.md`).
- Claude 컴포넌트 파일(스킬·에이전트·규칙)은 **영어**로 작성한다. `INTENT.md`/`DETAIL.md`의 서술 내용은 `[filid:lang]` = `ko`.
- 커밋에 co-author를 넣지 않는다.
- 검증 명령: `yarn typecheck` (루트, 14 workspaces) · `yarn filid test:run` · 루트 `yarn test:run`.
- 새 코드는 `seiri_function-boundaries` §3(한 파일 한 export)와 `seiri_code-comments` §3(export 선언에 문서 주석)을 따른다.

## 설계 결정 — 조건을 통째로 지우지 않는다

`diagnostics.length > 0`을 단순 삭제하면 config 경고(`CONFIG_WARNING`)와 어댑터 진단까지 certainty에서 사라진다. 그쪽은 **진짜 측정 불확실성**이므로 남겨야 한다.

**채택**: 진단을 코드로 분류해, _findings 성격_ 진단만 certainty 계산에서 제외한다. 현재 findings 성격 코드는 `intent-document-contract`, `detail-document-contract` 두 개이며 이들은 규칙 위반과 1:1로 대응한다(377/236 일치 확인). 나머지 진단은 종전대로 certainty를 낮춘다.

세 소비자(`fractalScan/utils`, `verificationScan/utils`, `structureValidate/utils`)의 최소 공통 프랙털은 `plugins/filid/src/mcp/tools`이고 그 아래 기존 organ `utils/`가 있다(`createToolSnapshot.ts` 소재). 공유 헬퍼는 거기 둔다 — `filid_code-placement` §1·§2.

## 태스크

### T1 — 공유 판별 헬퍼 신설

**파일 (신규)**: `plugins/filid/src/mcp/tools/utils/isFindingDiagnostic.ts`

책임: 하나의 `ToolDiagnostic`이 *규칙 findings*를 옮긴 것인지(=certainty에 영향 없음) 판정한다.

```ts
import { BUILTIN_RULE_IDS } from "../../../constants/builtinRuleIds.js";
import type { ToolDiagnostic } from "../../../types/toolEnvelope.js";

/**
 * Diagnostic codes that carry a rule finding rather than missing evidence.
 * A document-contract diagnostic restates a violation the validator already
 * reports; it means the evidence was read, not that it could not be obtained.
 */
const FINDING_DIAGNOSTIC_CODES: ReadonlySet<string> = new Set([
  BUILTIN_RULE_IDS.INTENT_DOCUMENT_CONTRACT,
  BUILTIN_RULE_IDS.DETAIL_DOCUMENT_CONTRACT,
]);

/**
 * Decide whether a diagnostic reports a finding instead of unusable evidence.
 * @param diagnostic Diagnostic emitted by the snapshot or config loader.
 * @returns true when the diagnostic restates a rule finding and therefore must
 *   not lower analysis certainty.
 */
export function isFindingDiagnostic(diagnostic: ToolDiagnostic): boolean {
  return FINDING_DIAGNOSTIC_CODES.has(diagnostic.code);
}
```

**소비**: 없음(선행 태스크 없음). **생산**: 명명 export `isFindingDiagnostic`.

**주의**: 리터럴을 쓰지 않는다. `plugins/filid/src/constants/builtinRuleIds.ts:2`에 `INTENT_DOCUMENT_CONTRACT`/`DETAIL_DOCUMENT_CONTRACT`가 존재함을 확인했으므로 반드시 `BUILTIN_RULE_IDS`를 import 한다 (`seiri_reuse-first` §1).

**검증**: `yarn filid typecheck`.

### T2 — 세 status/certainty 해석기 정정 (fail-first)

**파일 (수정)**

1. `plugins/filid/src/mcp/tools/fractalScan/utils/resolveFractalScanCertainty.ts`
   `diagnostics.length > 0` → `diagnostics.some((d) => !isFindingDiagnostic(d))`
2. `plugins/filid/src/mcp/tools/verificationScan/utils/resolveVerificationScanStatus.ts:17` — 동일 치환
3. `plugins/filid/src/mcp/tools/structureValidate/utils/resolveProjectValidationStatus.ts:19` — 동일 치환

시그니처는 셋 다 **변경하지 않는다**. `resolveFractalScanCertainty`에는 현재 문서 주석이 없으므로, 수정하는 김에 `seiri_code-comments` §3 형식의 주석을 추가한다.

**파일 (신규 테스트)**: `plugins/filid/src/__tests__/unit/mcp/envelopeCertainty.test.ts`

fail-first로 먼저 작성해 **현재 코드에서 실패하는 것을 확인한 뒤** T2 수정을 적용한다. 최소 케이스:

- 모든 축 `exact` + 문서 findings 진단 N건 → `resolveFractalScanCertainty`가 `exact`를 반환한다 (현재는 `indeterminate` → 실패해야 정상).
- 모든 축 `exact` + `CONFIG_WARNING` 진단 1건 → 여전히 `indeterminate`.
- `graphCertainty: indeterminate` + 진단 0건 → `indeterminate` (기존 동작 유지).
- 두 축 모두 `unsupported` → `unsupported` (기존 동작 유지).
- `resolveFractalScanStatus(exact, 3)` → `violations` — 지금까지 도달 불가능했던 분기가 살아났음을 고정한다.
- `resolveVerificationScanStatus` / `resolveProjectValidationStatus`에 대해 findings 진단만 있는 경우 `violations`를 반환한다.

**소비**: T1의 `isFindingDiagnostic`. **생산**: 세 해석기의 정정된 동작.

**검증**:

```bash
yarn filid test:run     # 신규 테스트 포함 전체 통과
yarn typecheck          # 루트, 14 workspaces clean
```

회귀 확인: 기존 `plugins/filid/src/__tests__/unit/mcp/fractalScan.test.ts`, `verificationScanSummary.test.ts`, `vnextSnapshotTools.test.ts`가 계속 통과해야 한다. 이들이 `status`를 단언하지 않음은 확인했으나, 스냅샷 비교로 간접 의존할 수 있으므로 실행 결과로 판정한다.

### T3 — enrich-docs 전제조건 문구 정정

**파일 (수정)**

1. `plugins/filid/skills/enrich-docs/reference.md:19`

   현재: `Stop before editing when \`status\` is not \`ok\`; report its diagnostics instead of treating incomplete adapter evidence as a clean snapshot.`

   변경 후: `Stop before editing when \`status\` is \`indeterminate\` or \`unsupported\`; report its diagnostics instead of treating incomplete adapter evidence as a clean snapshot. A \`violations\` status is the expected input — the document findings it carries are what this skill exists to correct.`

2. `plugins/filid/skills/enrich-docs/SKILL.md:37`

   현재: `Stop on non-\`ok\` status; do not interpret unsupported or indeterminate evidence as a clean audit.`

   변경 후: `Stop on \`indeterminate\` or \`unsupported\` status; do not interpret them as a clean audit. \`violations\` proceeds — its findings are the work.`

영어 유지(사용자 전역 규칙). T2 없이 T3만 적용하면 여전히 `indeterminate`가 반환되어 효과가 없다 — 두 태스크는 함께여야 의미가 있다.

**검증**: `yarn docs:format:check` (마크다운 포맷·규칙 해시 가드).

### T4 — 빌드·버전·플러그인 산출물 재생성

```bash
yarn filid version:patch      # 0.10.9 → 0.10.10
yarn filid build              # version:sync → rules → pages → mcp → hooks → compile-plugin
yarn docs:format:check
yarn typecheck && yarn test:run
```

`bridge/`, `plugin.json`, `mcp_config.json`, `hooks.json`, `.codex-plugin/`은 이 단계 산출물이다. 손편집하지 않는다.

**커밋**: `fix(filid): treat document-contract diagnostics as findings, not lost evidence`

### T5 — PR 및 파이프라인 재개 (별도 세션 필요)

T4의 빌드 산출물은 **MCP 서버 재시작 후**에만 유효하다. 따라서 다음은 새 세션에서 수행한다.

1. T1–T4를 별도 브랜치·PR로 올려 머지한다 (filid 자체 변경이므로 `maencof/archive-layer`와 분리).
2. 새 세션에서 `/reload-plugins` 후 `fractal_scan`이 `plugins/maencof-lens`에 대해 `status: "violations"`를 반환하는지 확인한다 — 이것이 해금의 수용 기준이다.
3. `maencof/archive-layer`에서 `/filid:pipeline` 재실행. `resolve` 단계의 문서 10건이 `enrich-docs`로 실제 적용된다.
4. 문서 재작성 범위는 **스킬 기본 동작대로 넓게 허용**한다(결정됨). `plugins/maencof-lens` 한 곳만 해도 확정 3건 외 12개 프랙털·25건이 함께 정리된다.
5. `revalidate`가 PASS면 PR #115를 머지한다.

## 현재 상태 — 이미 닫힌 것

PR #115에서 `entry-point-surface` 9건은 커밋 `802c2ae4`로 닫혔고 재측정으로 확인됐다(각 진입점 표면 `certainty: exact`, 이름 열거). 리뷰 디렉터리 `.filid/review/maencof-archive-layer-…`는 FAIL이라 보존되어 있으며 `justifications.md`의 `resolve_commit_sha: fefb7fbe…`가 다음 revalidate의 기준선이다.

## 계획 리뷰 — 판정 `grounded-only` (2026-08-20)

깊이 **challenge**: 세 MCP 도구의 엔벨로프 status 의미론을 바꾸는 공개 계약 변경이 트리거. 외부 시선 위임 대신 grounding 진행을 선택했으므로 판정은 `cleared`가 아니라 `grounded-only`다.

### 확인된 주장

| 주장                                                                               | 증거                                                                                                               |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `ToolDiagnostic.code: string`                                                      | `plugins/filid/src/types/toolEnvelope.ts:23`                                                                       |
| `SNAPSHOT_TOOL_DIAGNOSTIC_CODES` = `config-warning`, `verification-path-not-found` | `plugins/filid/src/constants/mcpContracts.ts:68-71`                                                                |
| 세 해석기 경로·행 번호                                                             | `resolveFractalScanCertainty.ts:22`, `resolveVerificationScanStatus.ts:17`, `resolveProjectValidationStatus.ts:19` |
| `mcp/tools/utils/` organ 실재                                                      | `createToolSnapshot.ts` 소재 확인                                                                                  |
| 기존 테스트 파일 실재                                                              | `__tests__/unit/mcp/`에 `fractalScan.test.ts`·`verificationScanSummary.test.ts`·`vnextSnapshotTools.test.ts`       |
| filid v0.10.9, `version:patch`·`build`·`build:mcp` 스크립트 실재                   | `plugins/filid/package.json`                                                                                       |
| `yarn docs:format:check` 실재                                                      | 루트 `package.json`                                                                                                |
| MCP 서버가 빌드 산출물 구동                                                        | `plugins/filid/mcp_config.json` → `bridge/mcp-server.cjs` (416KB, 8/18 빌드)                                       |

### 발견

- **F1 (인라인 수정 완료)** — T1이 상수 사용을 "존재하면"으로 조건부 서술했다. `plugins/filid/src/constants/builtinRuleIds.ts:2`에 `INTENT_DOCUMENT_CONTRACT`/`DETAIL_DOCUMENT_CONTRACT`가 **실재**함을 확인해, `BUILTIN_RULE_IDS` import를 의무 조항으로 고쳤다.
- **F2 (설계 강화)** — `plugins/filid/src/core/projectSnapshot/projectSnapshot.ts:140-146`에서 `snapshot.diagnostics`는 `selectedAdapters` · `documents` · `entryPoints` · `dependencies` · `verificationClaims` **다섯 스트림의 연결**이다. 이 중 `documents`만 findings 성격이고 나머지는 진짜 증거 문제다. 따라서 `diagnostics.length > 0`을 통째로 지우는 안은 어댑터·의존성 증거 문제까지 certainty에서 지워버린다 — 코드 기준 필터가 맞는 설계임이 확인됐다. 이 저장소 스캔에서 비문서 코드 진단은 0건이었으나, 그것은 우연한 현재 상태이지 보장이 아니다.
- **F3 (대안 검토·기각)** — 더 근본적인 안 (B): 문서 findings를 애초에 `snapshot.diagnostics`에 중복 기재하지 않고 findings 채널로 분리한다. 기각 사유 — 엔벨로프 `diagnostics` 배열이 소비자가 실제로 읽는 표면이며(이번 cross-review도 여기서 in-scope 행을 복사했다), 스냅샷 형상과 전 소비자를 건드리는 훨씬 큰 공개 계약 변경이 된다. (A)는 그 표면을 보존하면서 오분류만 고친다.

### 잔여 리스크

`entryPoints`·`dependencies` 스트림이 장래에 findings 성격 진단을 추가하면 같은 오분류가 재발한다. 헬퍼가 코드 집합 기준이므로 그때는 집합에 추가하면 되고, T2의 테스트가 의미론을 고정한다.

## 미해결로 남기는 것 (이 계획 범위 밖)

- 프로젝트 루트 스코프의 `verification.certainty: indeterminate` — `plugins/r-statistics/…`·`shared/…`의 `test-record-case-cap` 5건(동적 테이블 파라미터화)에서 발생한다. T1–T3와 무관하며 루트 스코프 스캔에만 영향한다.
- 서브트리 스코프에서 `dependencyGraph.certainty`가 깨지는 문제 — 스코프 밖 import를 해소할 수 없는 구조적 한계다. `enrich-docs`는 플러그인 루트 이상에서 호출하면 회피되므로 이번 해금에는 걸리지 않는다.
