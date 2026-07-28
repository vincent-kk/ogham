# 07. FCA-AI 규칙 레퍼런스

> `@ogham/filid` 1.0이 시행하는 모든 규칙, 상수, 임계값의 종합 레퍼런스. 이 문서가 규칙 의미의 원장이며, 사용자에게 배포되는 canonical 규칙 문서는 `plugins/filid/templates/rules/` 아래 4개다.

---

## 배포되는 규칙 문서

| 문서                            | 담는 규칙                                                                  | 로딩                         |
| ------------------------------- | -------------------------------------------------------------------------- | ---------------------------- |
| `filid_fractal-boundaries.md`   | 노드 분류, 진입점 표면, organ 접근·면책, zero-peer, DAG·깊이·pure-function | 상시                         |
| `filid_module-documents.md`     | INTENT/DETAIL 계약, 50줄 cap, 면책 항목 문법                               | `paths:` INTENT.md/DETAIL.md |
| `filid_verification-records.md` | spec-document/test-record 역할, 15·32 cap, 세는 법, 계약 링크              | `paths:` 테스트 글롭         |
| `filid_code-placement.md`       | LCA 배치, 계획 사전·사후조건, 문서 선행 워크플로                           | 상시                         |

4개 모두 `required` 다 — filid 규칙은 부분 채택 대상이 아니라서 `manifest.json` 에 optional 엔트리가
없고 setup 체크박스 UI 에는 아무것도 렌더되지 않는다.

## 제품 경계

filid 가 소유하는 것: INTENT/DETAIL 문서 계약과 최소 context chain, fractal/organ/pure-function/hybrid
분류, 진입점 표면·외부 import 경계·의존성 DAG, 최저 공통 fractal 배치와 읽기 전용
`sourcePath → targetPath` 계획, 검증 문서 역할·파일 cap·분할·계약 링크, FCA 범위 cross-review 증거.

filid 가 소유하지 **않는** 것: 함수 분할, 네이밍, 파일 크기, 순환 복잡도, LCOM4, 커버리지 품질,
fail-first 실천, 범용 AST 편집, 파일 이동, import rewrite, commit, push, pull request. 앞의 여섯은
코드 작성 품질 영역이라 seiri 등 별도 규칙 세트가 담당하고, 뒤의 여섯은 실행 행위다 — restructure
도구는 계획하고 검증할 뿐, 변경은 외부 행위자가 수행한다.

---

## 상수 테이블

| 상수명                          | 값         | 정의 위치                             | 용도                         |
| ------------------------------- | ---------- | ------------------------------------- | ---------------------------- |
| `INTENT_MD_LINE_LIMIT`          | `50`       | `constants/documentValidation.ts`     | INTENT.md 최대 줄 수         |
| `BOUNDARY_KEYWORDS`             | 정규식 3개 | `constants/documentValidation.ts`     | 3-tier 경계 섹션 탐지        |
| `KNOWN_ORGAN_DIR_NAMES`         | 15개 이름  | `constants/organNames.ts`             | organ 디렉터리 식별          |
| `SPEC_DOCUMENT_CASE_CAP`        | `15`       | `constants/verificationThresholds.ts` | spec-document 파일당 상한    |
| `TEST_RECORD_CASE_CAP`          | `32`       | `constants/verificationThresholds.ts` | test-record 파일당 상한      |
| `DEFAULT_SCAN_OPTIONS.maxDepth` | `10`       | `constants/scanDefaults.ts`           | 기본 트리 깊이 한계          |
| `TOOL_INLINE_BUDGET_BYTES`      | `16384`    | `constants/toolEnvelope.ts`           | MCP inline 반환 예산 (UTF-8) |
| `SCAN_RESULT_MAX_CHARS`         | `30000`    | `constants/scanDefaults.ts`           | scan 직렬화 payload 예산     |

CC, LCOM4, 테스트 안정 기간, peer file 개수 상한 상수는 1.0에 존재하지 않는다. 해당 규칙 자체가 제거되었다.

### KNOWN_ORGAN_DIR_NAMES 전체 목록

```typescript
// base (shared/UI)
'components', 'utils', 'types', 'hooks', 'helpers',
'lib', 'styles', 'assets', 'constants',
// test/infra
'test', 'tests', 'spec', 'specs', 'fixtures', 'e2e',
```

`references`, `docs`, `plans` 같은 docs-as-code compartment 이름은 **의도적으로 빠져 있다.** 이 목록에 이름을 넣으면 같은 이름의 실제 코드 모듈이 조용히 organ으로 재분류되어 적용되어야 할 규칙이 사라진다. 프로젝트는 `.filid/config.json`의 `structure.additionalOrganNames`로 직접 선언한다. 선언되지 않은 compartment도 문서와 module index가 없으면 분류 기본값이 이미 organ이므로, 등록은 "index가 있어도 organ으로 취급한다"를 강제할 때만 필요하다.

### BOUNDARY_KEYWORDS

```typescript
const BOUNDARY_KEYWORDS = {
  alwaysDo: /^###?\s*(always\s*do)/im,
  askFirst: /^###?\s*(ask\s*first)/im,
  neverDo: /^###?\s*(never\s*do)/im,
} as const;
```

### 확실성 3분법

```typescript
const ANALYSIS_CERTAINTIES = {
  EXACT: "exact",
  INDETERMINATE: "indeterminate",
  UNSUPPORTED: "unsupported",
} as const;
```

**`indeterminate`와 `unsupported`는 절대 PASS로 변환되지 않는다.** 어댑터가 정확히 측정하지 못한 규칙은 통과가 아니라 불확실성 finding을 낸다.

---

## 내장 규칙 15개

| Rule ID                    | category      | severity | scope        | granularity | 소유 증거                          |
| -------------------------- | ------------- | -------- | ------------ | ----------- | ---------------------------------- |
| `intent-document-contract` | documentation | error    | documents    | node        | INTENT parser                      |
| `detail-document-contract` | documentation | error    | documents    | node        | DETAIL parser                      |
| `organ-no-intentmd`        | structure     | error    | nodes        | node        | node classification                |
| `entry-point-surface`      | module        | warning  | entry-points | node        | StructureAdapter                   |
| `module-entry-point`       | module        | warning  | entry-points | node        | StructureAdapter                   |
| `max-depth`                | structure     | error    | nodes        | node        | tree                               |
| `circular-dependency`      | dependency    | error    | dag          | project     | dependency graph                   |
| `pure-function-isolation`  | dependency    | error    | dag          | node        | dependency graph                   |
| `zero-peer-file`           | structure     | warning  | nodes        | node        | adapter peer roles                 |
| `external-import-boundary` | dependency    | error    | boundaries   | project     | dependency graph + entry point     |
| `spec-document-case-cap`   | verification  | error    | verification | project     | VerificationAdapter                |
| `test-record-case-cap`     | verification  | error    | verification | project     | VerificationAdapter                |
| `spec-fragmentation`       | verification  | error    | verification | project     | DETAIL groups + verification files |
| `spec-contract-link`       | verification  | warning  | verification | project     | DETAIL groups + adapter marker     |
| `legacy-criteria-ledger`   | documentation | warning  | documents    | project     | ProjectSnapshot legacy evidence    |

`granularity: project` 규칙은 snapshot당 한 번, `node` 규칙은 대상 노드마다 한 번 평가된다. severity와 enable 여부는 `.filid/config.json`의 `rules` override로 바꾼다.

### 1.0에서 제거된 규칙

| 제거된 규칙            | 사유                                              |
| ---------------------- | ------------------------------------------------- |
| `naming-convention`    | 이름은 Seiri 소유. FCA 판정의 자동 gate가 아니다. |
| `index-barrel-pattern` | `entry-point-surface`가 열거 가능성으로 대체      |
| CC / LCOM4 / file-size | 코드 품질 지표는 filid의 개념 소유가 아니다       |
| coverage 규칙          | 테스트 품질은 Seiri 소유                          |
| 3+12 테스트 규칙       | spec 15 / test-record 32의 역할 구분으로 대체     |
| test → spec 승격       | 두 문서 역할 사이에 승격 관계가 없다              |

---

## 분류 우선순위

**분류는 서술이지 규범이 아니다.** 분류기는 디스크에 있는 파일만 관찰한다. 문서도 module index도 선언하지 않은 디렉터리는 독립 계약을 주장한 적이 없으므로 `organ`이다. 무엇이 fractal이어야 *하는가*는 분류 기본값이 아니라 규칙 결과다 — 소유 subtree 밖에서 소비되는 organ을 `external-import-boundary`가 소비자 경로를 증거로 보고한다.

`classifyNode(ClassifyInput)`는 다음 순서로 결정한다.

```
1. INTENT.md 존재                             → fractal (명시적 선언)
2. DETAIL.md 존재                             → fractal (문서화된 모듈 경계)
3. __name__ 또는 .name infrastructure 패턴    → organ
4. known organ name 또는 additionalOrganNames → organ (이름이 구조를 이긴다)
5. 어댑터가 kind: "module" 진입점 보고        → fractal
6. fractal child 없는 leaf directory          → organ
7. 어댑터가 무부작용·stateless 확정           → pure-function
8. 그 밖에                                     → organ (기본값)
```

**5단계는 `kind: "module"`만 읽는다.** `executable`·`framework` 진입점과 config `structure.entryPointOverrides`로 주입된 경로는 분류를 바꾸지 못한다. 그 구분이 없으면 `SKILL.md` 같은 markdown-as-implementation이 산문 디렉터리를 fractal로 만들어, 코드용으로 쓰인 규칙을 산문에 적용하게 된다. override는 진입점 표면(`entry-point-surface`)의 입력이지 분류 입력이 아니다.

**6단계가 순수성보다 앞선다.** 따라서 `pure-function`은 하위 디렉터리를 가진 노드에서만 나온다. leaf compartment는 그 안의 무엇도 부작용이 없더라도 organ이다 — 이름 붙일 만한 격리는 모듈에 대한 주장이고, 그 주장을 한 적 없는 leaf에는 적용하지 않는다.

**8단계가 organ인 것이 설계다.** 기본값을 fractal로 두면 아직 FCA가 아닌 코드베이스의 모든 디렉터리에 "INTENT.md를 추가하라"는 요구가 자동 생성되고, 분류가 "하위 디렉터리가 우연히 있는지" 같은 우발적 사실에 좌우된다.

`hybrid`는 자동 분류하지 않는다. 점진적 이행을 위해 수동으로만 지정한다. 어댑터가 순수성을 판단할 수 없으면 `unsupported`로 남기며 추측으로 PASS시키지 않는다.

organ 아래에서도 traversal은 중단되지 않는다. organ 안에 문서나 module index를 가진 하위 디렉터리가 있으면 organ의 자식이 아니라 **독립 fractal로 재분류된다.**

---

## 검증 규칙 상세

### INTENT.md (`intent-document-contract`)

1. **줄 수**: `countLines(content) > 50` → `error`. 빈 문자열은 0줄, 후행 개행 무시.
2. **3-tier 경계**: `Always do` / `Ask first` / `Never do` 세 섹션이 모두 있어야 한다.
3. 섹션 heading은 영어로 유지한다 — validator의 machine-readable anchor다. 서술 내용은 `[filid:lang]`이 지정한 언어를 따른다.
4. 50줄에 근접한다는 것은 모듈을 더 작은 프랙탈로 분해하라는 신호다. **한도를 올리지 않는다.**

### DETAIL.md (`detail-document-contract`)

필수 섹션은 넷이다.

```md
## Requirements

## API Contracts

## Acceptance Criteria

## Last Updated
```

`## Acceptance Criteria` 아래 그룹은 그 DETAIL.md 안에서 고유한 안정 ID를 갖는다.

```md
### AC-structure-placement — Shared unit placement

- Observable: ...
- Expected: ...
```

DETAIL.md는 append-only 이력이 아니다. 갱신할 때마다 현재 상태로 재구성한다. 누락되거나 중복된 acceptance group ID는 거부된다.

### organ 보호 (`organ-no-intentmd`)

organ 노드에는 INTENT.md를 두지 않는다. 독립 문서가 필요하면 `fractal`로 재분류한다. `PreToolUse` 훅이 write 시점에 차단한다.

### peer file (`zero-peer-file`)

1.0의 허용 집합은 하드코딩된 목록이 아니라 노드마다 계산된다.

- `INTENT.md`, `DETAIL.md`
- **어댑터가 보고한** 진입점 파일의 basename
- eponymous 파일 1개 (디렉터리명과 같은 이름, 예: `auth/auth.ts`)
- 감지된 framework 예약 파일
- `.filid/config.json`의 `additional-allowed` (문자열이면 전역, 객체면 `paths` glob이 일치할 때만)

core가 진입점 파일명을 알지 못하므로, 이 규칙은 어댑터 증거 없이는 판정하지 않는다.

### 경계 (`external-import-boundary`)

fractal을 대상으로 할 때:

- 외부 소비자는 대상 fractal의 **진입점만** 참조한다.
- 같은 fractal 내부 파일은 local barrel을 경유하지 않고 구체 내부 파일을 직접 참조한다. local `index.ts`는 외부 경계이지 내부 라우팅 계층이 아니다.
- 형제 fractal은 형제의 진입점을 참조하며 **부모 barrel로 우회하지 않는다.** 부모 barrel이 나를 재노출하므로 그 경로는 순환이다.

organ을 대상으로 할 때는 판정 기준 자체가 다르다. **organ은 진입점을 갖지 않는 것이 정의이므로 "진입점을 경유하라"를 적용할 대상이 없다.** 대신 소비자가 어디에 앉아 있는지로 판정한다.

| 소비자 위치             | 참조 경로             | 판정                                |
| ----------------------- | --------------------- | ----------------------------------- |
| 소유 fractal subtree 안 | organ 파일 직접       | 통과 — LCA 배치가 만드는 정상 형태  |
| 밖                      | 소유 fractal의 진입점 | 통과                                |
| 밖                      | organ 파일 직접       | 위반 — 선언된 면책이 있을 때만 통과 |

edge는 organ을 소유 fractal로 승격한 뒤라 organ 정체성이 없으므로, 규칙은 `evidence.resolvedPath`에서 `resolveOwningOrganPath(organPaths, ownerPath, filePath)`로 복구한다 — 소유자 안에 있으면서 그 파일을 담는 **가장 깊은** organ이다.

finding은 organ 경로와 소유자를 함께 밝히고 해소책 셋을 제시한다: organ을 fractal로 승격 · 소비자들의 lowest common fractal로 이동 · 소유자 DETAIL.md에 면책 선언.

#### 경계 면책 (`## Boundary Exemptions`)

면책은 **소유 프랙탈의 DETAIL.md에 조건부로** 선언한다. 보편 문서 계약을 늘리지 않기 위해, 면책이 실제로 필요한 프랙탈만 이 섹션을 갖는다. 섹션이 없는 것이 정상이며 그 자체로는 위반이 아니다.

```md
## Boundary Exemptions

### <organ path> — <short title>

- **Consumers**: <경로 또는 glob, barrel 경유면 `entry-point`>
- **Direct import**: allowed | not allowed
- **Reason**: <barrel이 이 소비자를 서비스할 수 없는 이유, 또는 organ이 소비자들의 lowest common fractal로 이동하지 않은 이유>
```

면책이 인정되는 조건은 넷이며 모두 만족해야 한다.

1. 선언된 organ path가 실제 대상 organ과 일치한다 (소유자 기준 절대 경로로 정규화되어 비교된다).
2. `Direct import: allowed`다.
3. 소비자 경로가 `Consumers` glob에 매치된다.
4. `Reason`이 비어 있지 않다.

**`Reason`이 비면 면책이 아니라 미충족 계약이다.** 위반이 그대로 남고 `detail-document-contract` finding이 하나 더 붙는다. 직접 import 면책의 표준 사례는 훅 번들이다 — 배럴을 import하면 번들러가 배럴이 재수출하는 모듈 전체를 끌어온다.

### DAG (`circular-dependency`)

snapshot의 실제 의존 그래프에서 닫힌 directed cycle을 반환한다. placeholder PASS는 없다. 그래프를 만들 수 없는 파일이 cycle 결론에 영향을 줄 수 있으면 전체 결과는 `indeterminate`다.

**소유 subtree 안의 organ 참조는 cycle adjacency에서 빠진다.** 자식 fractal이 부모 소유 organ을 참조하면 organ이 부모로 승격되면서 `부모 → 자식 → 부모` 왕복이 생기는데, 이것은 런타임 순환이 아니라 승격 인공물이다. edge 자체는 **보존한다** — `restructure_plan`이 incoming edge로 소비자를 계산하므로, 지우면 LCA 배치가 내부 소비자에 눈이 먼다.

---

## 검증 문서 모델

core는 파일명이나 확장자가 아니라 **역할**을 안다.

| 역할            | 파일당 cap | 프로젝트 총량 | 성격                            |
| --------------- | ---------- | ------------- | ------------------------------- |
| `spec-document` | **15**     | 제한 없음     | 현재 실행 가능한 계약           |
| `test-record`   | **32**     | 제한 없음     | QA·회귀·장애 재현·스펙 히스토리 |

- "3 basic + 12 complex" 분할은 규칙이 아니다. 권장 형태일 뿐이며 gate는 총합만 본다.
- cap을 넘으면 **coverage를 지우지 않고 파일을 나눈다.** coverage가 cap보다 우선한다.
- test-record는 시간이 지나 spec-document로 승격되지 않는다.

### case 계산 규칙

| 입력                                        | 계산                   |
| ------------------------------------------- | ---------------------- |
| 일반 case 선언, skip, todo                  | 각각 1                 |
| 정적으로 열거된 parameterized rows          | 행 수만큼              |
| 정적 parameterized suite 안의 case          | suite row 수를 곱함    |
| property test 선언                          | 생성 시행과 무관하게 1 |
| 동적 table, 사용자 wrapper, 해석 불가 alias | `indeterminate`        |

### 여러 spec-document (`spec-fragmentation`, `spec-contract-link`)

한 소유 프랙탈에 spec-document가 여러 개면 다음을 모두 만족해야 한다.

1. 그 프랙탈에 DETAIL.md가 있다.
2. 모든 spec-document가 하나 이상의 DETAIL acceptance group ID를 선언한다.
3. 서로 다른 파일의 ID 집합이 겹치지 않는다.
4. 선언된 ID가 실제 DETAIL.md에 존재한다.

같은 계약 그룹을 `part1`, `part2`처럼 나눈 경우가 `spec-fragmentation` 위반이다.

계약 연결 토큰은 `filid:contract <acceptance-group-id>`다. core는 토큰과 ID만 알고, 각 VerificationAdapter가 해당 언어의 주석이나 metadata에서 토큰을 추출한다. 한 파일에서 토큰을 반복해 여러 group을 선언할 수 있다.

---

## Hook 이벤트별 규칙 적용

| Hook 이벤트                      | 적용 내용                                            | 차단 가능     |
| -------------------------------- | ---------------------------------------------------- | ------------- |
| `SessionStart`                   | 세션 캐시 초기화, FCA 프로젝트 감지                  | X (항상 통과) |
| `UserPromptSubmit`               | 턴당 visit map 리셋, 세션 첫 FCA 규칙 포인터         | X (항상 통과) |
| `PreToolUse` (Read\|Write\|Edit) | 소유 모듈 INTENT 체인 전달, INTENT/DETAIL write gate | O             |

차단은 `permissionDecision: 'deny'`로 **해당 도구 호출 하나만** 막는다. 턴은 중단되지 않는다.

1.0에는 `SubagentStart` 역할 제한 훅과 `PostToolUse` change tracking이 없다. legacy `.filid/criteria.md` 발견도 hook deny가 아니라 `structure_validate`의 `legacy-criteria-ledger` finding으로 보고된다.

---

## 관련 문서

- [01-ARCHITECTURE.md](./01-ARCHITECTURE.md) — 규칙이 아키텍처에서 차지하는 위치
- [02-BLUEPRINT.md](./02-BLUEPRINT.md) — 각 규칙의 구현 모듈
- [06-HOW-IT-WORKS.md](./06-HOW-IT-WORKS.md) — 규칙이 파이프라인에서 실행되는 방식
- [08-API-SURFACE.md](./08-API-SURFACE.md) — 규칙 결과 DTO
