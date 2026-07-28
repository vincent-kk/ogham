# filid 검증 후속 수정 계획

브랜치 `filid/issue-101` 의 F1·F2·F5·F6·alreadyPlaced 수정을 적대적으로 검증한 결과, **명세와 코드가 어긋나 filid 가 잘못 동작하는 항목 4건**과 그로부터 파생된 문서·검증 결함을 확정했다. 이 문서는 그 수정 계획이다.

측정 근거는 전부 `node --import tsx` 로 src 를 직접 호출해 얻었다. 실행 중 MCP 서버는 `bridge/mcp-server.cjs` 번들을 띄우므로 src 변경이 반영되지 않는다.

---

## 전역 제약 (모든 Task 가 상속한다)

- **작업 범위**: `plugins/filid/` 소스·테스트·모듈 문서와 `.metadata/filid/` 설계 문서. `bridge/`, `public/`, `.codex-plugin/` 은 **절대 손대지 않는다** — 빌드 산출물이며 사용자가 직접 커밋한다.
- **커밋 금지**: 모든 Task 완료 후 사용자 승인을 받는다.
- **검증 명령** (`cd plugins/filid` 기준, 동시 실행 금지):
  - `yarn typecheck` → exit 0, 출력 0 바이트
  - `yarn vitest run` → exit 0, `Tests N passed | 7 skipped`, 0 failed
  - 파이프 뒤 `$?` 는 `tail` 의 것이다. 반드시 실제 exit code 를 읽는다.
- **코드 규약**:
  - 단문 제어문은 중괄호 없이 (루트 `eslint.config.mjs` 의 `curly: ["warn","multi"]`).
  - 파일 하나에 exported 함수 하나. 헬퍼는 본문 8줄 이하만 동거 허용.
  - 정규식은 함수 밖 모듈 스코프 상수로 선언한다.
  - 경로 연산은 `@ogham/cross-platform` portable API 만 쓴다. 네이티브 `node:path` 로 정체성·포함 비교 금지.
  - 주석은 최소화하되, **왜 이 절이 필요한가**가 코드에서 안 보이면 파일 헤드에 한 줄 남긴다.
- **문서 규약**:
  - `INTENT.md` / `DETAIL.md` 는 **현재 명세만** 서술한다. 이력·버전 노트·커밋 id 금지.
  - `DETAIL.md` 는 append-only 쓰기가 PreToolUse 훅에 의해 거부된다(`handleDetailMdWrite.ts`). 갱신할 때는 해당 절을 **현재 상태로 재작성**한다.
  - `INTENT.md` 는 50줄 캡이며 정확히 50줄인 파일은 라인-중립 편집도 차단된다. 편집이 필요하면 같은 edit 안에서 49줄 이하로 줄인다.
  - `plugins/filid/src/**` 문서 언어는 한국어(기존 관행), `SKILL.md` · agent md 는 영어.
- **테스트 규약**: 기본값 검증은 리터럴을 복제하지 말고 상수에서 파생한다. 명세 문자열(rule id, finding code)은 리터럴로 둔다.

---

## 왜 지금까지 안 보였나 (모든 Task 공통 배경)

ogham 저장소 루트의 `.filid/config.json` 은 **손으로 쓴 6개짜리 `rules` 블록**이다. `applyOverrides` 는 목록에 없는 규칙을 건드리지 않으므로 ogham 자신은 roster 기본값을 그대로 쓴다. 결함은 **config 파일이 없는 프로젝트**와 **`project_init` 이 생성한 15개 전체 config 를 가진 프로젝트**에서만 발현한다. filid 를 filid 로 검증하는 한 절대 보이지 않는 사각이다.

---

## 파일 지도

| 경로                                                                           | 성격                                           | 담당 Task |
| ------------------------------------------------------------------------------ | ---------------------------------------------- | --------- |
| `plugins/filid/src/constants/builtinRuleSeverities.ts`                         | **신규** — builtin 규칙 severity 정본          | T1        |
| `plugins/filid/src/core/rules/ruleEngine/evaluation/loadBuiltinRules.ts`       | 수정 — 정본 참조                               | T1        |
| `plugins/filid/src/core/infra/configLoader/loaders/createDefaultConfig.ts`     | 수정 — `ERROR_RULE_IDS` 제거, 정본 참조        | T1        |
| `plugins/filid/src/__tests__/unit/core/configLoader.test.ts`                   | 수정 — 결함을 고정하던 단언 교체               | T1        |
| `plugins/filid/src/core/infra/configLoader/DETAIL.md`                          | 수정 — `createDefaultConfig` 계약 1줄          | T1        |
| `plugins/filid/src/core/restructure/validator/validateTargetPostconditions.ts` | **신규** — target 측 postcondition 공통부      | T2        |
| `plugins/filid/src/core/restructure/validator/validateMovePostconditions.ts`   | 수정 — source 부재 + 공통부 합성               | T2        |
| `plugins/filid/src/core/restructure/validator/validatePlanPostconditions.ts`   | 수정 — `alreadyPlaced` 순회 추가               | T2        |
| `plugins/filid/src/core/restructure/__tests__/planPartition.test.ts`           | 수정 — alreadyPlaced postcondition 케이스 추가 | T2        |
| `plugins/filid/src/core/restructure/DETAIL.md`                                 | 수정 — Requirements·API·AC 절                  | T2, T3    |
| `plugins/filid/src/core/restructure/specifiers/stripPathExtension.ts`          | 수정 — dot-only 세그먼트 가드                  | T3        |
| `plugins/filid/src/core/restructure/__tests__/importSpecifier.test.ts`         | 수정 — dot 세그먼트 케이스 추가                | T3        |
| `plugins/filid/src/__tests__/unit/core/ruleEngine.test.ts`                     | 수정 — 무의미하던 테스트를 유효하게            | T4        |
| `.metadata/filid/01-ARCHITECTURE.md`                                           | 수정 — AC-28·AC-31                             | T1, T2    |
| `.metadata/filid/07-RULES-REFERENCE.md`                                        | 수정 — severity 정본 서술                      | T1        |
| `.metadata/filid/08-API-SURFACE.md`                                            | 수정 — postcondition 서술                      | T2        |
| `.metadata/filid/05-COST-ANALYSIS.md`                                          | 수정 — git spawn 횟수                          | T5        |
| `.metadata/filid/06-HOW-IT-WORKS.md`                                           | 수정 — git spawn 횟수, 폴백 조건               | T5        |
| `plugins/filid/src/lib/listGitIgnoredPaths.ts`                                 | 수정 — 파일 헤드 주석 1줄                      | T5        |

---

## T1 — builtin severity 정본을 하나로 (**최우선**)

### 문제

severity 정본이 두 곳에 있고 **3개 규칙에서 값이 다르다.** 측정:

```
$ node --import tsx severity-divergence.mjs
rule                      roster   config   effective  diverges
organ-no-intentmd         warning  error    error      <<< YES
external-import-boundary  error    warning  warning    <<< YES
spec-contract-link        warning  error    error      <<< YES

diverging rules: 3 / 15
```

- `loadBuiltinRules.ts` 의 roster 가 `.metadata/filid/07-RULES-REFERENCE.md:89~` 표와 일치하는 정본이다.
- `createDefaultConfig.ts:6-17` 의 `ERROR_RULE_IDS` 하드코딩 집합이 그것을 덮어쓴다.
- `createToolSnapshot.ts:30` 이 `loaded.config ?? createDefaultConfig()` 이므로 **config 없는 프로젝트 전부**가, `initProject.ts:40` 이 같은 함수를 쓰므로 **`project_init` 이 만든 프로젝트 전부**가 발산값을 받는다.

가장 심각한 건 `external-import-boundary` 다. FCA 경계 위반은 명세상 `error` 인데 기본 프로젝트에서 `warning` 으로 강등되고, `skills/resolve/reference.md §4` 의 severity 게이트가 `warning` 을 "May be deferred" 로 취급한다 — **경계 위반이 결정 없이 연기 가능해진다.**

### 왜 상수 파일인가

`createDefaultConfig` 가 `loadBuiltinRules` 를 직접 부르면 `core/infra/configLoader → core/rules/ruleEngine` 값 의존이 생기고, `loadBuiltinRules.ts:4` 가 이미 `configLoader/index.js` 를 참조하므로 순환 후보가 된다(현재는 `import type` 이지만 어댑터의 lexical 스캔이 이를 구분하는지에 의존하게 된다). 양쪽이 이미 import 하는 leaf organ `src/constants/` 에 정본을 두면 이 질문 자체가 사라진다.

### 단계

**1) 신규 파일** `plugins/filid/src/constants/builtinRuleSeverities.ts`:

```ts
import type { BuiltinRuleId } from "./builtinRuleIds.js";

/**
 * @file builtinRuleSeverities.ts
 * @description The one severity a builtin rule has before any project override.
 *
 * The rule roster and the default config both need this value, and when they
 * each carried their own copy they drifted: an unlisted rule silently kept the
 * roster's severity while a listed one silently took the config's.
 */
export const BUILTIN_RULE_SEVERITIES = {
  "intent-document-contract": "error",
  "detail-document-contract": "error",
  "organ-no-intentmd": "warning",
  "entry-point-surface": "warning",
  "module-entry-point": "warning",
  "max-depth": "error",
  "circular-dependency": "error",
  "pure-function-isolation": "error",
  "zero-peer-file": "warning",
  "external-import-boundary": "error",
  "spec-document-case-cap": "error",
  "test-record-case-cap": "error",
  "spec-fragmentation": "error",
  "spec-contract-link": "warning",
  "legacy-criteria-ledger": "warning",
} as const satisfies Record<BuiltinRuleId, "error" | "warning">;
```

`satisfies` 가 선언 지점에서 누락·오타 키를 잡는다. 값은 위 측정표의 `roster` 열과 `LEGACY_CRITERIA_LEDGER_RULE.SEVERITY`(= `'warning'`)에서 그대로 옮긴 것이다.

**2)** `loadBuiltinRules.ts` — 15개 rule 객체의 `severity:` 리터럴을 정본 참조로 바꾼다. 예:

```ts
severity: BUILTIN_RULE_SEVERITIES[BUILTIN_RULE_IDS.ORGAN_NO_INTENTMD],
```

`LEGACY_CRITERIA_LEDGER` 항목의 `severity: LEGACY_CRITERIA_LEDGER_RULE.SEVERITY` 도 동일하게 바꾼다. `LEGACY_CRITERIA_LEDGER_RULE` 의 `SEVERITY` 필드는 다른 소비자가 없으면 제거한다 — 먼저 확인:

```
$ grep -rn "LEGACY_CRITERIA_LEDGER_RULE.SEVERITY" plugins/filid/src
```

1건(loadBuiltinRules)뿐이면 `legacyCriteriaLedger.ts` 에서 `SEVERITY` 를 지운다. 2건 이상이면 남겨두고 값이 정본과 같은지만 확인한다.

**3)** `createDefaultConfig.ts` — `ERROR_RULE_IDS` 집합과 그 import 를 삭제하고 정본을 읽는다:

```ts
const rules = Object.fromEntries(
  Object.values(BUILTIN_RULE_IDS).map((ruleId) => [
    ruleId,
    { enabled: true, severity: BUILTIN_RULE_SEVERITIES[ruleId] },
  ]),
) as FilidConfig["rules"];
```

**4)** `src/__tests__/unit/core/configLoader.test.ts:66-72` — 결함을 고정하던 테스트를 교체한다. 현재:

```ts
it('keeps the established hard-rule severities', () => {
  const config = createDefaultConfig();
  expect(config.rules['organ-no-intentmd']?.severity).toBe('error');   // ← 결함을 고정
  ...
});
```

교체(리터럴 복제 금지 — 정본에서 파생):

```ts
it("seeds every rule with the builtin roster severity", () => {
  const config = createDefaultConfig();

  for (const rule of loadBuiltinRules())
    expect(config.rules[rule.id]?.severity).toBe(rule.severity);
});
```

이 테스트가 T1 의 회귀 방지선이다 — roster 와 default config 가 다시 갈리면 즉시 붉어진다. `loadBuiltinRules` import 를 파일 상단에 추가한다.

**5)** `src/core/infra/configLoader/DETAIL.md:34` — "14개 built-in rule" 은 실제 15개이므로 함께 고친다:

```
- `createDefaultConfig(language?, adapterIds?)` — 15개 built-in rule을 roster
  기본 severity 그대로 실은 v2 config와 auto adapter mode를 만든다.
```

**6)** `.metadata/filid/07-RULES-REFERENCE.md` — 표(89행대) 값은 이미 정본과 일치하므로 그대로 두고, `organ-no-intentmd` 절 끝에 정본 위치를 명시하는 한 문장을 넣는다:

```
표의 severity는 `constants/builtinRuleSeverities.ts`가 정본이며, roster와
`createDefaultConfig`가 같은 상수를 읽는다. 프로젝트 config의 `severity`만이
이를 덮어쓴다.
```

**7)** `.metadata/filid/01-ARCHITECTURE.md` AC-28(374행) 은 `warning` 을 주장하므로 이제 참이 된다. 문구는 유지하고, AC 표에 한 줄 추가:

```
| AC-32 | roster와 `createDefaultConfig`가 같은 severity 정본을 읽어, config 없는 프로젝트와 `project_init` 프로젝트의 규칙 severity가 규칙 참조표와 일치한다 | [07](./07-RULES-REFERENCE.md) |
```

### 완료 판정

```
$ cd plugins/filid && yarn typecheck            # exit 0, 무출력
$ yarn vitest run                               # 0 failed
$ node --import tsx <scratch>/severity-divergence.mjs
  ... diverging rules: 0 / 15                   # ← 이 줄이 판정
```

추가로, 격리 fixture(설정 파일 없음)에서 severity 가 `warning` 으로 바뀌는지 확인:

```
$ node --import tsx <scratch>/organ-matrix.mjs <scratch>/fx-organ
  organ-no-intentmd fired on:
    warning  ./src/utils          # 수정 전에는 error
```

---

## T2 — `alreadyPlaced` 에 postcondition 을 건다

### 문제

`validatePlanPostconditions.ts:15` 는 `plan.moves` 만 순회한다. `alreadyPlaced` 항목은 **어떤 assertion 도 받지 않으므로** `valid` 가 자명하게 true 가 된다. 실측 — 외부 actor 가 유닛을 계획이 지명한 적 없는 경로로 옮기고 소비자를 갱신한 경우:

```
$ node --import tsx alreadyplaced-gap2.mjs <fx> <plan.json>
plan moves / alreadyPlaced : 0 / 1
planned path               : ./src/lib/logger.ts
actual landing path        : ./src/elsewhere/logger.ts
postcondition              : status=indeterminate valid=true findings=0
findings                   : []
```

`filid_code-placement` §4 는 "A functionally working but different result is a failed restructure" 이고 "postcondition checks the exact target" 이다. `moves` 였다면 `target-missing` 으로 잡힌다. 지금은 통과한다.

`08-API-SURFACE.md:505` 가 "postcondition은 `moves`만 순회하므로" 라고 **의도로 적어 두었다.** 그러나 그 서술이 해결하려던 문제는 "source 부재 + target 존재를 한 경로에 요구하는 모순" 하나뿐이다. 나머지 assertion(target 존재·node type·artifact·import rewrite)은 `alreadyPlaced` 에도 그대로 적용 가능하며, 모순도 만들지 않는다. **모순 하나를 피하려고 검증 전체를 버린 것이 결함이다.**

### 설계

`validateMovePostconditions` 에서 source 부재 검사만 떼어내고 나머지를 공통부로 만든다.

- `validateTargetPostconditions(snapshot, move)` — target 존재 + node type + required artifact + import rewrite (신규)
- `validateMovePostconditions(snapshot, move)` — source 부재 검사 + 위 공통부 (기존 파일이 합성으로 바뀜)
- `validatePlanPostconditions` — `moves` → `validateMovePostconditions`, `alreadyPlaced` → `validateTargetPostconditions`

`affectedImports` 의 항등 rewrite(`currentSpecifier === requiredSpecifier`)는 **그대로 둔다.** 위 gap2 사례에서 소비자가 `../lib/logger.js` → `../elsewhere/logger.js` 로 바뀌면 항등 rewrite 의 증거가 사라져 `import-rewrite-missing` 이 발화한다 — 항등 rewrite 는 잡음이 아니라 이 검사의 증거다.

### 단계

**1) 신규 파일** `plugins/filid/src/core/restructure/validator/validateTargetPostconditions.ts`:

```ts
import {
  RESTRUCTURE_VALIDATION_CODES,
  RESTRUCTURE_VALIDATION_MESSAGES,
} from "../../../constants/restructure.js";
import type { ProjectSnapshot } from "../../../types/fractal.js";
import type {
  MoveInstruction,
  PlanValidationFinding,
} from "../../../types/restructure.js";

import { resolveTargetNode } from "./resolveTargetNode.js";
import { snapshotContainsPath } from "./snapshotContainsPath.js";
import { validateImportRewrites } from "./validateImportRewrites.js";
import { validateRequiredArtifacts } from "./validateRequiredArtifacts.js";

/**
 * Everything a planned landing must show, minus the source's absence. An
 * instruction whose target equals its source has nothing to move, so only that
 * one assertion cannot apply to it — the rest still can, and without them an
 * actor who lands the unit somewhere the plan never named passes.
 */
export function validateTargetPostconditions(
  snapshot: ProjectSnapshot,
  move: MoveInstruction,
): PlanValidationFinding[] {
  const findings: PlanValidationFinding[] = [];
  if (!snapshotContainsPath(snapshot, move.targetPath))
    findings.push({
      code: RESTRUCTURE_VALIDATION_CODES.TARGET_MISSING,
      message: RESTRUCTURE_VALIDATION_MESSAGES.TARGET_MISSING,
      path: move.targetPath,
      sourcePath: move.sourcePath,
    });
  const targetNode = resolveTargetNode(snapshot, move);
  if (targetNode && targetNode.type !== move.targetNodeType)
    findings.push({
      code: RESTRUCTURE_VALIDATION_CODES.TARGET_NODE_TYPE_MISMATCH,
      message: RESTRUCTURE_VALIDATION_MESSAGES.TARGET_NODE_TYPE_MISMATCH,
      path: targetNode.path,
      sourcePath: move.sourcePath,
    });
  findings.push(
    ...validateRequiredArtifacts(move, targetNode),
    ...validateImportRewrites(snapshot, move),
  );
  return findings;
}
```

**2)** `validateMovePostconditions.ts` 를 합성으로 축소한다 (import 목록도 함께 정리):

```ts
import {
  RESTRUCTURE_VALIDATION_CODES,
  RESTRUCTURE_VALIDATION_MESSAGES,
} from "../../../constants/restructure.js";
import type { ProjectSnapshot } from "../../../types/fractal.js";
import type {
  MoveInstruction,
  PlanValidationFinding,
} from "../../../types/restructure.js";

import { snapshotContainsPath } from "./snapshotContainsPath.js";
import { validateTargetPostconditions } from "./validateTargetPostconditions.js";

export function validateMovePostconditions(
  snapshot: ProjectSnapshot,
  move: MoveInstruction,
): PlanValidationFinding[] {
  const findings: PlanValidationFinding[] = [];
  if (snapshotContainsPath(snapshot, move.sourcePath))
    findings.push({
      code: RESTRUCTURE_VALIDATION_CODES.SOURCE_STILL_PRESENT,
      message: RESTRUCTURE_VALIDATION_MESSAGES.SOURCE_STILL_PRESENT,
      path: move.sourcePath,
      sourcePath: move.sourcePath,
    });
  findings.push(...validateTargetPostconditions(snapshot, move));
  return findings;
}
```

`resolveTargetNode`, `validateImportRewrites`, `validateRequiredArtifacts` import 는 이 파일에서 제거된다.

**3)** `validatePlanPostconditions.ts`:

```ts
export function validatePlanPostconditions(
  snapshot: ProjectSnapshot,
  plan: RestructurePlan,
): PlanValidationResult {
  const findings = [
    ...plan.moves.flatMap((move) => validateMovePostconditions(snapshot, move)),
    ...plan.alreadyPlaced.flatMap((move) =>
      validateTargetPostconditions(snapshot, move),
    ),
  ];
  findings.push(
    ...validateBoundaryPostconditions(snapshot),
    ...validateDependencyPostconditions(snapshot),
  );
  return { valid: findings.length === 0, findings };
}
```

`plan.alreadyPlaced` 는 `readRestructurePlan` 의 zod 스키마에서 `.default([])` 이므로 구 아티팩트에도 안전하다(`readRestructurePlan.ts:54`). 배럴(`src/core/restructure/index.ts`)은 공개 4개만 내보내므로 **변경 불필요**.

**4)** `src/core/restructure/__tests__/planPartition.test.ts` 에 케이스 2개 추가. 기존 `'does not report source-still-present for such a plan'` 옆에:

```ts
it("reports target-missing when the already-placed unit is not at the planned path", () => {
  const plan = createRestructurePlan(snapshot, {
    path: ROOT,
    requests: [sameSpotRequest],
  });
  const movedAway = snapshotWithout(PATHS.SOURCE);

  const findings = validatePlanPostconditions(movedAway, plan).findings;

  expect(findings.map((finding) => finding.code)).toContain("target-missing");
});

it("still passes when the already-placed unit is where the plan says", () => {
  const plan = createRestructurePlan(snapshot, {
    path: ROOT,
    requests: [sameSpotRequest],
  });

  expect(validatePlanPostconditions(snapshot, plan).valid).toBe(true);
});
```

`snapshotWithout` 은 이 파일의 기존 snapshot fixture 헬퍼를 본떠 만든다 — source 파일을 `peerFiles` 에서 제거한 사본을 돌려주면 된다. **기존 `'does not report source-still-present for such a plan'` 은 반드시 계속 통과해야 한다** — 이것이 이번 변경이 (a) 의 원래 모순을 되살리지 않았다는 증거다.

**5)** `src/core/restructure/DETAIL.md` — 세 곳을 현재 상태로 재작성한다.

Requirements 19-22행:

```
- 계산된 target이 source와 같으면 옮길 것이 없다. 그런 instruction은
  `moves`가 아니라 `alreadyPlaced`로 분리한다. postcondition은 두 갈래를
  다르게 본다 — `moves`에는 source 부재까지, `alreadyPlaced`에는 source
  부재를 뺀 나머지 전부를 요구한다. 그래야 "source 부재"와 "target 존재"가
  한 경로에 동시에 요구되지 않으면서도, 계획 밖 경로에 착지한 유닛이
  통과하지 않는다.
```

API Contracts 49-50행:

```
- `validatePlanPostconditions(snapshot, plan): PlanValidationResult` — `moves`와
  `alreadyPlaced` 양쪽, 그리고 post snapshot의 boundary·DAG 불일치를 finding으로
  반환.
```

AC-restructure-already-placed(70-76행)에 한 줄 추가:

```
- 그 계획의 postcondition은 `source-still-present`를 내지 않되, 유닛이 계획된
  경로에 없으면 `target-missing`을 낸다.
```

**6)** `.metadata/filid/08-API-SURFACE.md:505` 를 사실로 고친다:

```
- 계산된 target이 source와 같으면 `moves`가 아니라 `alreadyPlaced`로 간다. 옮길 것이 없는 요청이며, postcondition은 `alreadyPlaced`에 source 부재만 면제하고 exact target·node type·artifact·import rewrite는 그대로 요구한다 — "source 부재"와 "target 존재"가 한 경로에 동시에 요구되지 않으면서 계획 밖 착지도 잡힌다. 요청은 버려지지 않고 계산된 LCA·basis·consumer를 그대로 실어 돌려준다.
```

**7)** `.metadata/filid/01-ARCHITECTURE.md` AC-31(377행):

```
| AC-31 | 계산된 target이 source와 같은 요청은 `alreadyPlaced`로 분리되어 `moves`에 없고, 그 계획의 postcondition은 `source-still-present`를 내지 않되 유닛이 계획된 경로에 없으면 `target-missing`을 낸다 | [08](./08-API-SURFACE.md) |
```

### 완료 판정

```
$ cd plugins/filid && yarn typecheck && yarn vitest run     # 각각 exit 0, 0 failed
$ node --import tsx <scratch>/alreadyplaced-gap2.mjs <fx> <plan.json>
  postcondition : status=indeterminate valid=false findings=3
  findings      : target-missing 1 + import-rewrite-missing 2
```

회귀 확인 — 정상 케이스는 계속 통과해야 한다. `plugins/filid` 에 대해 `organNameHint: "lib"` 계획을 만들고 postcondition 을 돌려 `findings 0` 이 나오는지 본다(수정 전 실측: `valid:true, findingCount:0`).

---

## T3 — `stripPathExtension` 의 dot-only 세그먼트

### 문제

```
$ node --import tsx specifier-edges.mjs
stripPathExtension:
  ".."     -> "."          # 잘못됨
  "../.."  -> "../."       # 잘못됨
applySpecifierExtension("../../x", "..") -> "../../x."   # 깨진 specifier
```

`..` 은 이름+확장자가 아닌데 확장자로 해석된다. 현재 유일한 방어선은 `specifierDenotesPath` 의 `isPathLike` 가드다 — `'..'` 는 `./` 로도 `../` 로도 시작하지 않아 path-like 판정에서 탈락하므로 위 경로에 도달하지 않는다. 그 가드를 제거하면:

```
guard 제거:  ".." vs /p/a -> true       # 도달 가능해짐
```

그리고 **전체 874 테스트가 그대로 통과한다** — 하중을 받는 가드가 테스트로 고정되어 있지 않다. `import x from '..'` 는 합법 ESM 이므로 실제 트리에 존재할 수 있다.

### 단계

**1)** `stripPathExtension.ts` — 모듈 스코프 정규식 + 가드 추가:

```ts
import { portableBasename } from "@ogham/cross-platform/paths";

const DOT_SEGMENT = /^\.+$/;

/**
 * Drop one trailing extension from a path's final segment. A leading dot marks
 * a hidden name rather than an extension, so `.gitignore` is returned unchanged;
 * a segment that is only dots is a relative marker, so `..` is not an extension
 * of `.`; and directory separators are never touched.
 */
export function stripPathExtension(path: string): string {
  const segment = portableBasename(path);
  if (DOT_SEGMENT.test(segment)) return path;
  const dot = segment.lastIndexOf(".");
  if (dot <= 0) return path;
  return path.slice(0, path.length - (segment.length - dot));
}
```

**2)** `src/core/restructure/__tests__/importSpecifier.test.ts` 에 케이스 2개 추가:

```ts
it("treats a dot-only segment as a relative marker, not an extension", () => {
  expect(stripPathExtension("..")).toBe("..");
  expect(stripPathExtension("../..")).toBe("../..");
  expect(stripPathExtension("/p/a/.gitignore")).toBe("/p/a/.gitignore");
});

it("leaves a bare directory specifier unsupported rather than rewriting it", () => {
  // '..' 은 path-like 가 아니므로 rewrite 후보가 되지 않는다. 이 가드가 없으면
  // stripPathExtension('..') 이 깨진 specifier 를 만들어 낸다.
  const result = buildImportRewrites(snapshot, SOURCE, TARGET, [
    CONSUMER_WITH_DOTDOT,
  ]);

  expect(result.rewrites).toEqual([]);
  expect(result.decisionReasons).toContain("import-rewrite-unsupported");
});
```

두 번째 케이스의 `CONSUMER_WITH_DOTDOT` 는 이 파일의 기존 snapshot fixture 에 `rawSpecifier: '..'` 이고 `resolvedPath` 가 source 의 디렉터리인 evidence 를 하나 추가해 만든다. 이 테스트가 `isPathLike` 가드의 회귀 방지선이다.

**3)** `src/core/restructure/DETAIL.md` API Contracts 41-42행:

```
- `stripPathExtension(path): string` — 마지막 세그먼트의 확장자 하나를 제거한
  경로. 디렉터리 구분자, dot-prefixed 이름, dot만으로 이루어진 상대 마커는
  건드리지 않는다.
```

> T2 도 같은 파일을 고친다. **T2 를 먼저 끝내고 T3 를 착수한다.** T2 는 Requirements 19-22행·API 49-50행·AC 70-76행을, T3 는 API 41-42행을 건드리므로 순서만 지키면 충돌하지 않는다.

### 완료 판정

```
$ cd plugins/filid && yarn typecheck && yarn vitest run     # 0 failed
$ node --import tsx <scratch>/specifier-edges.mjs
  ".."     -> ".."
  "../.."  -> "../.."
  ("../../x", "..") -> "../../x"
```

그리고 **mutation 이 붉어지는지** 확인한다 — `specifierDenotesPath.ts` 에서 `if (!isPathLike(rawSpecifier)) return false;` 를 지우고 `yarn vitest run` 을 돌렸을 때 실패가 나와야 한다(수정 전에는 867 passed 로 통과했다). 확인 후 `git checkout HEAD -- <파일>` 로 원복한다.

---

## T4 — 무의미하던 organ 테스트를 유효하게

### 문제

`checkOrganNoIntentmd.ts:21` 의 `if (node.type !== 'fractal' || !node.hasIntentMd) return [];` 를 지워도 **874 테스트가 전부 통과한다.** 그러나 이 가드는 하중을 받는다 — 지운 채 fixture 를 돌리면:

```
organ-no-intentmd fired on:
  ./src/utils
  ./src/constants     # INTENT.md 가 아예 없는 순수 organ
```

`src/constants` 에 "became a fractal through INTENT.md alone" 이라는 **거짓 메시지**가 나간다. F2 가 고친 결함(도달 불가 술어)의 정확한 반대편이다.

원인은 테스트 부재가 아니라 **무의미한 테스트**다. `ruleEngine.test.ts` 의 `'should pass when organ has no INTENT.md'` 는

```ts
const node = makeNode({ type: "organ", hasIntentMd: false });
```

를 쓰는데 `makeNode` 기본 `name` 이 `'module'`(organ 이름 아님, 48-51행)이라, 분류 가드가 아니라 **organ 이름 가드**에 걸려 통과한다. 술어의 다른 절이 이미 막고 있으므로 이 테스트는 목표한 절을 전혀 검사하지 않는다.

### 단계

`src/__tests__/unit/core/ruleEngine.test.ts` 의 해당 테스트를 organ 이름 노드로 바꾼다:

```ts
it("should pass when an organ-named organ has no INTENT.md", () => {
  const rule = loadBuiltinRules().find(
    (r) => r.id === BUILTIN_RULE_IDS.ORGAN_NO_INTENTMD,
  )!;
  // organ 이름 가드가 아니라 분류 가드가 유일한 침묵 사유가 되도록 이름을 맞춘다.
  const node = makeNode({
    path: "/root/utils",
    name: "utils",
    type: "organ",
    hasIntentMd: false,
  });
  const ctx: RuleContext = { node, tree: makeTree([node]) };
  expect(rule.check(ctx)).toHaveLength(0);
});
```

### 완료 판정

```
$ cd plugins/filid && yarn vitest run     # 0 failed
```

그리고 mutation 이 붉어지는지 확인한다 — `checkOrganNoIntentmd.ts` 에서 `if (node.type !== 'fractal' || !node.hasIntentMd) return [];` 를 지우고 실행하면 **이 테스트가 실패해야 한다.** 확인 후 `git checkout HEAD --` 로 원복한다. (수정 전에는 이 mutation 이 867 passed 로 통과했다.)

---

## T5 — 문서를 측정값에 맞춘다

### 문제 1 — "scan당 git 1회" 는 거짓

PATH 앞단에 로깅 git shim 을 두고 스냅샷 1회 생성:

```
=== git invocations: 6
   5  ls-files --others --ignored --exclude-standard --directory -z
   1  rev-parse --show-toplevel
```

`spawnSync` 스택 추적으로 호출 지점 5곳 확인:

```
1. resolveAdapters → ecmascriptStructureAdapter.detect → discoverEcmascriptFiles
2. resolveAdapters → ecmascriptStructureAdapter.discoverSourceFiles
3. scanProject (scanProject.ts:27)
4. collectVerificationClaims → ecmascriptVerificationAdapter.detect
5. collectVerificationClaims → ecmascriptVerificationAdapter.discover
```

`createIgnoreFilter` 의 "Create it once per scan" 은 **traversal 단위**로는 지켜지지만 traversal 이 5개다. 정확성 문제는 아니므로(같은 결과를 5번 계산) **코드가 사실이고 문서가 결함**이다. 문서를 고친다.

### 문제 2 — 폴백 조건이 하나 빠졌다

git 무시 디렉터리 **안쪽**을 스캔 루트로 주면 git 이 죽는다:

```
$ cd fx/outbox/app && git ls-files --others --ignored --exclude-standard --directory
fatal: git ls-files: internal error - directory entry not superset of prefix
exit=128
```

`code !== 0` → `[]` → 필터 무효 → 스캔 정상 유지(2 nodes 확인). 안전한 폴백이지만 모듈 문서는 "git 이 없거나 work tree 밖" 두 경우만 명시한다.

### 단계

**1)** `.metadata/filid/06-HOW-IT-WORKS.md:216` — 횟수와 폴백 조건 둘 다:

```
판정은 git에게 맡긴다. `git ls-files --others --ignored --exclude-standard --directory -z`를 호출해 결과를 집합으로 들고, traversal의 모든 후보가 그 집합을 조회한다. filter는 traversal마다 한 번 만들어 그 traversal 동안 재사용한다 — 경로당이 아니다. 한 snapshot에는 tree scan·adapter source discovery·verification discovery의 traversal이 있어 호출은 그 수만큼 일어난다. `--others`가 미추적 항목만 반환하므로 "무시됨 **그리고** 미추적"이 구조적으로 보장된다 — force-add된 파일은 index에 있어 애초에 나오지 않으므로 별도 교차검증이 필요 없다. `--directory`는 통째로 무시된 디렉터리를 슬래시 하나로 접어, `node_modules/`가 있는 저장소도 밀리초 안에 답한다.
```

**2)** `.metadata/filid/06-HOW-IT-WORKS.md:218` — 폴백 세 번째 경우 추가:

```
ADR-01이 glob 의존을 제거한 상태이므로 `.gitignore` 문법을 직접 해석하지 않는다. git이 없거나, work tree 밖이거나, 스캔 루트 자체가 무시된 디렉터리 안이어서 git이 거부하면 집합이 비고 필터는 상시 false가 되어, ignore 필터가 없던 때와 **동일한** 스캔이 된다. git의 부재가 보고 범위를 조용히 줄이는 일은 없다.
```

**3)** `.metadata/filid/06-HOW-IT-WORKS.md:177` — `(scan당 git 1회)` → `(traversal당 git 1회)`

**4)** `.metadata/filid/05-COST-ANALYSIS.md:75` — 해당 문장 교체:

```
traversal은 git-ignored 경로를 걸러내기 위해 `git ls-files`를 **traversal당 한 번** spawn한다 — 경로당이 아니며, 결과 집합은 그 traversal 동안 재사용된다. 한 snapshot은 tree scan과 adapter discovery를 합쳐 여러 traversal을 돈다. 걸러낸 경로만큼 이후 단계의 입력이 줄어들지만, 순비용의 방향은 측정하지 않았다.
```

**5)** `plugins/filid/src/lib/listGitIgnoredPaths.ts` 파일 헤드 주석 마지막 문단:

```
 * Returns nothing when git is absent, when the root sits outside a work tree,
 * or when git refuses the query — it exits non-zero if the root is itself
 * inside an ignored directory. An unavailable git must never shrink what a
 * scan reports.
```

**6)** `.metadata/filid/01-ARCHITECTURE.md` AC-30 은 "git이 없으면" 만 말하므로 범위를 넓힌다:

```
| AC-30 | git이 무시하면서 추적하지 않는 경로는 snapshot 증거에 들어가지 않고, git이 답하지 못하면 필터 이전과 동일하게 스캔한다 | [06](./06-HOW-IT-WORKS.md) |
```

### 완료 판정

```
$ cd plugins/filid && yarn vitest run          # 0 failed (문서만 바뀌므로 불변)
$ grep -rn "scan당 한 번\|scan당 git 1회" .metadata/filid/    # 결과 없음
```

---

## Task 간 인터페이스

| 생산                                                                                                                     | 소비                                                                 |
| ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| T1 → `BUILTIN_RULE_SEVERITIES` (`src/constants/builtinRuleSeverities.ts`, `Record<BuiltinRuleId, 'error' \| 'warning'>`) | `loadBuiltinRules`, `createDefaultConfig`                            |
| T2 → `validateTargetPostconditions(snapshot: ProjectSnapshot, move: MoveInstruction): PlanValidationFinding[]`           | `validateMovePostconditions`, `validatePlanPostconditions`           |
| T3 → `stripPathExtension` 의 dot-only 불변식                                                                             | `applySpecifierExtension`, `specifierDenotesPath` (호출부 변경 없음) |

**순서 제약은 하나뿐이다: T2 → T3** (둘 다 `src/core/restructure/DETAIL.md` 를 편집). T1·T4·T5 는 서로 및 T2/T3 와 독립이며 어느 순서로든 된다.

---

## 범위 밖 (의도적으로 하지 않는 것)

| 항목                                                                                                        | 이유                                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `organsCreated` / `fractalsCreated` 가 "생성된 organ" 이 아니라 "organ 을 목적지로 하는 move 수" 를 세는 것 | 사용자 지시로 제외. 실측 재확인함 — 파일 20개가 이미 있는 `src/constants` 로 옮기는 계획에서 `organsCreated: 1`.                                                                                                            |
| git ls-files 호출 5회 → 1회로 줄이는 최적화                                                                 | 정확성 문제 아님(같은 결과를 5번 계산). adapter 계약(`detect`/`discoverSourceFiles` 시그니처) 변경 또는 AsyncLocalStorage 도입이 필요해 blast radius 가 크다. T5 로 문서를 사실에 맞춘 뒤, 원한다면 별도 작업으로 제안한다. |
| `alreadyPlaced` 의 항등 rewrite 23건 제거                                                                   | T2 가 이를 `import-rewrite-missing` 검출의 증거로 쓴다. 제거하면 T2 의 검출력이 떨어진다.                                                                                                                                   |
| 타 세션 보고서의 rewrite 예시 문자열 오류 (`../logging/logger.js`)                                          | 저장소 문서에 없다 — `grep -rn "\.\./logging/logger" plugins/filid .metadata/filid` 결과 0건. 수정 대상이 존재하지 않는다.                                                                                                  |

---

## 전체 완료 판정

```
$ cd plugins/filid
$ yarn typecheck                                   # exit 0, 출력 0 바이트
$ yarn vitest run                                  # exit 0, 0 failed
$ cd /Users/Vincent/Workspace/ogham
$ git status --porcelain                           # bridge/mcp-server.cjs 외 의도한 파일만
```

그리고 T1·T2 의 fixture 재현이 각각 뒤집혔는지 확인한다:

```
severity-divergence.mjs   → diverging rules: 0 / 15
alreadyplaced-gap2.mjs    → valid=false, target-missing 포함
```

번들 재빌드와 커밋은 사용자가 수행한다.
