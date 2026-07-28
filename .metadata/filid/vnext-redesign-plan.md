# Filid vNext 재설계 — 설계·개발 단일 원장

> **상태**: 승인됨(Plan of Record)
>
> **목표 버전**: `@ogham/filid` 1.0.0
>
> **확정일**: 2026-07-26
>
> **적용 범위**: `/Users/Vincent/Workspace/ogham/plugins/filid`
>
> **실행 진입점**: 후속 개발 세션에서 `/seiri:execute`

이 문서는 Filid vNext의 사상, 제품 경계, 규칙 의미, MCP 계약, 목표 파일 구조,
마이그레이션 순서와 검증 조건을 함께 고정하는 단일 원장이다. 구현 중 세부 판단이
이 문서와 충돌하면 이 문서를 먼저 갱신하고, 그 다음 DETAIL.md와 코드를
변경한다.

## 문서 권위와 현재 작업 범위

- 이 문서는 **목표 상태의 유일한 설계·개발 원장**이다.
- [`slimdown-plan.md`](./slimdown-plan.md)는 v0.8.2 구현을 바탕으로 한
  역사적 경량화안이다. 재사용 가능한 관찰만 참고하며 결론은 상속하지 않는다.
- `01-ARCHITECTURE.md`부터 `08-API-SURFACE.md`까지는 v0.8.x **현재 구현
  스냅샷**이다. vNext 구현이 끝난 후 실제 코드에 맞춰 일괄 갱신한다.
- `FCA-AI_base.md`, `FCA-AI_detail.md`,
  `FCA-AI-Context-Management-and-Operations-Specification/`은 사상의 출발점을
  보존하는 역사 자료다. 이 문서와 충돌하는 3+12, promotion, AST 동기화,
  고정 에이전트 역할은 vNext 규범이 아니다.
- 이 문서를 작성하는 현재 작업에서는 설계 문서와 문서 인덱스만 수정한다.
  `plugins/filid/src/`, 플러그인 매니페스트, 생성물에는 손대지 않는다.

## 전역 제약 (모든 구현 작업이 상속)

아래 블록은 기존 계획의 저장소 제약을 그대로 승계한다. 개별 작업에서 빌드
표면을 제거하기 전까지 현재 상태의 실행 제약으로 적용한다.

- Node.js `>=20.0.0`. `fs.globSync` / `fs.glob` 은 Node 22+ 이므로 **사용 금지**.
  `fs.readdirSync(dir, { withFileTypes: true })` 재귀만 사용한다.
- TypeScript `^5.7`, ESM, Yarn 4.12 workspaces. 패키지 명령은 `yarn filid <script>`.
- 훅 도달 코드는 배럴(`index.js`) import 금지 — 구체 파일 경로 직접 import.
  `scripts/buildHooks.mjs` 의 바이트 캡(session-start 48KB / heavy 32KB /
  light 16KB / run-agy 12KB)과 금지 모듈 가드가 최종 방어선이다.
- 빌드 파이프라인:
  `clean → version:sync → build:rules → build:pages → build:compile → build:mcp → build:hooks → build:compile-plugin`.
  훅·MCP 만 빠르게 재빌드하려면 `yarn filid build:plugin`.
- `bridge/` · `public/` 는 커밋 대상 산출물. `dist/` 는 미커밋.
- 루트 `AGENTS.md` 는 **생성물이다**. 원본은
  `plugins/filid/templates/rules/filid_fca-policy.md` 이며 해시가
  `templates/rules/manifest.json` 에 `scripts/syncRuleHashes.mjs`
  (`yarn filid build:rules`) 로 기록된다. **`AGENTS.md` 를 직접 편집하지 말 것.**
- FCA 자체 규약 준수: 새 fractal 모듈에는 INTENT.md(≤50줄, 3-tier 경계) +
  배럴 `index.ts` 동반. organ 디렉터리에는 INTENT.md 금지.
- `.codex-plugin/` · 루트 `plugin.json` · `mcp_config.json` · `hooks.json` 은
  `build:compile-plugin`(plugin-compiler) 이 재생성한다. **손편집 금지.**

추가로 모든 후속 구현 작업은 다음을 지킨다.

- 각 프랙탈의 DETAIL.md를 코드보다 먼저 갱신한다. 공개 경계가 바뀌면
  INTENT.md도 먼저 갱신한다.
- 버그 수정과 새 동작은 `/seiri:implement`의 fail-first 증거를 남긴다.
  구조 이동은 변경 전·후에 동일한 characterization test가 통과해야 한다.
- 테스트 기록 파일 하나에는 의미론적 테스트를 최대 32개만 둔다. 계약 스펙
  파일 하나에는 최대 15개만 둔다. 필요한 검증은 삭제하지 않고 파일을 나눈다.
- 새 규칙과 MCP 계약은 JS/TS 확장자나 특정 테스트 프레임워크 이름을 core,
  policy, DTO에 넣지 않는다. 현재 생태계의 리터럴은 초기 어댑터 안에서만
  허용한다.
- machine path의 비교·조합·정규화는 현재 host 파일시스템을 직접 읽는
  경계를 제외하고 `@ogham/cross-platform`의 portable API를 사용한다.
- 정적 상수 객체와 배열은 함수 컨텍스트 밖의 module scope에 둔다. 반복되는
  안정적 문자열 값은 `src/constants`의 object enum 또는 문자열 상수가
  소유하며, 함수 안에는 입력으로부터 계산되는 동적 collection만 둔다.

## 목표와 완료 정의

Filid 1.0은 다음 네 가지 책임만 제품의 중심으로 가진다.

1. INTENT.md와 DETAIL.md를 통해 의도, 경계, 현재 계약을 관리한다.
2. FCA의 fractal/organ/pure-function/hybrid 구조, 진입점, 외부 경계와 DAG를
   검사한다.
3. 소비자와 공개 계약을 근거로 이동할 위치를 결정하고, 실행 가능한
   `sourcePath → targetPath` 계획과 사후조건을 제공한다.
4. 위 FCA 증거만을 사용하는 다관점 cross-review를 제공한다.

1.0 완료는 다음 상태를 뜻한다.

- Filid는 `@ast-grep/napi`, 전역 npm 모듈, `fast-glob` 없이 설치·실행된다.
- 플러그인의 core/policy/MCP DTO는 프로그래밍 언어와 테스트 프레임워크에
  중립적이다.
- 현재 생태계 지원은 등록된 초기 어댑터가 담당하며, 새 생태계는 core 수정
  없이 어댑터 등록으로 추가된다.
- spec-document와 test-record가 서로 다른 문서 역할로 판정된다.
- 구조 이동은 Filid가 위치를 결정하되 파일 이동·import 편집은 수행하지 않는다.
- DAG 검사는 placeholder가 아니라 실제 의존 그래프를 사용한다.
- 모든 MCP 반환은 작은 요약을 기본으로 하며 큰 데이터는 임시 artifact 경로로
  전달된다.
- Filid는 Seiri가 설치되지 않은 프로젝트에서도 독립적으로 동작한다.

## 비목표

- 함수 분할, 한 파일 한 함수, 순수성 향상, 명명, cyclomatic complexity,
  LCOM4, 파일 크기, 테스트의 fail-first 품질을 Filid가 일반 코드 품질 규칙으로
  소유하지 않는다.
- Filid MCP가 범용 grep/search/replace, AST 편집, 파일 이동, import rewrite,
  커밋, push, PR 생성 또는 코드 수정을 대신하지 않는다.
- cross-review가 보안·제품성·UI·운영성 등 모든 종류의 코드 리뷰를 대표하지
  않는다. Filid의 verdict는 FCA 계약과 구조에 대한 verdict다.
- DETAIL.md 외부에 두 번째 acceptance-criteria 원장을 유지하지 않는다.
- vNext core가 특정 언어의 파일 확장자, 진입점 이름, 테스트 호출 문법을
  추측하지 않는다.

## Filid와 Seiri의 소유권 경계

| 주제                                   | 개념 소유자 | Filid의 구체 책임                                    |
| -------------------------------------- | ----------- | ---------------------------------------------------- |
| 한 파일 한 exported function           | Seiri       | 분리 결과가 organ인지 fractal인지 판정               |
| 함수/파일 분리 방법                    | Seiri       | 분리된 단위의 소유 프랙탈과 목표 경로 결정           |
| purity/effect boundary                 | Seiri       | `pure-function`으로 명시된 FCA 노드의 의존 격리 검사 |
| 이름·파일 크기·CC·LCOM4                | Seiri       | FCA 위치 판단의 자동 gate로 사용하지 않음            |
| 테스트 유효성·fail-first·coverage      | Seiri       | 검증 문서 역할과 파일별 구조 cap만 검사              |
| INTENT/DETAIL                          | Filid       | 소유, 검증, 최소 컨텍스트 체인 제공                  |
| fractal/organ/entry point/boundary/DAG | Filid       | 소유, 스캔, 위반 판정                                |
| LCA와 공유 단위 배치                   | Filid       | lowest common **fractal** 계산과 목표 경로 산출      |
| cross-review                           | Filid       | FCA 증거 수집, 다관점 판정, 오탐 검증                |

경계의 대표 예시는 다음과 같다.

> Seiri가 “한 파일에 한 함수” 원칙으로 함수를 파일로 분리한다. Filid는 새 파일이
> 독립 계약을 갖지 않으면 소유 프랙탈의 organ으로, 독립 공개 계약을 가지면
> fractal로 분류한다. 여러 프랙탈이 소비하면 소비자들의 lowest common
> fractal 아래 organ에 배치한다.

이 연결은 런타임 의존이 아니다. Filid는 Seiri API나 도구를 호출하지 않으며,
구조 판정에 필요한 사실만 입력과 저장소 증거로 받는다.

## 목표 도메인 모델

### 노드

유지하는 노드 타입은 다음과 같다.

| 타입            | 의미                                         | 자동 목표로 제안 가능                  |
| --------------- | -------------------------------------------- | -------------------------------------- |
| `fractal`       | 독립 계약과 외부 경계를 가진 모듈            | 예                                     |
| `organ`         | 한 프랙탈에 소유되는 내부 관심사 compartment | 예                                     |
| `pure-function` | 외부 효과 없이 격리된 FCA 단위               | 어댑터 증거 또는 명시적 분류가 있을 때 |
| `hybrid`        | 점진적 이행을 위한 수동 transitional 상태    | 아니오                                 |

core의 노드는 진입점 파일명을 직접 알지 않는다. 어댑터가 정확한 파일 경로와
종류를 제공한다.

```ts
export type NodeType = "fractal" | "organ" | "pure-function" | "hybrid";

export interface EntryPointDescriptor {
  path: string;
  kind: "module" | "executable" | "framework";
  adapterId: string;
  surface: "enumerated" | "opaque" | "unsupported";
}

export interface FractalNode {
  path: string;
  name: string;
  type: NodeType;
  parentFractalPath: string | null;
  childFractalPaths: string[];
  organPaths: string[];
  hasIntentDocument: boolean;
  hasDetailDocument: boolean;
  entryPoints: EntryPointDescriptor[];
  depth: number;
  peerFiles: string[];
}
```

`hybrid`는 자동 분류하지 않는다. `pure-function`의 순수성을 어댑터가 판단할 수
없으면 `unsupported`로 남기며 추측으로 PASS시키지 않는다.

> **개정 (2026-07-28) — 분류와 organ 경계 재정의.** 자기 자신에 대한 첫 전체 구조검사가 832건을 냈고, 그 중 708건(`external-import-boundary`)과 cycle 3건이 하나의 뿌리에서 나왔다. 소유자 판단으로 아래 세 가지를 고친다. 상세 근거는 진행 원장의 「작업 10 후속」 절에 있다.
>
> **(1) organ에 진입점 경유를 요구하지 않는다.** "외부 소비자는 진입점만 참조하라"를 organ에 적용한 것은 잘못된 규칙이었다. 진입점을 갖지 않는 것이 organ의 정의이므로 경유할 대상이 없고, 결과적으로 organ 파일 참조가 전부 위반이 됐다.
>
> organ의 올바른 규칙은 **소유 프랙탈 바깥에서는 직접 참조할 수 없다**이다. 소유 프랙탈의 subtree 안에서는 — 중첩된 하위 fractal을 포함해 — 구체 파일을 직접 참조하는 것이 정상이다. 이것이 "공유 코드는 소비자들의 LCA에 둔다"는 배치 원칙과 짝을 이룬다. `src/types`가 `src`에 놓이는 이유가 `src` 하위 소비자들이 쓰기 위함이기 때문이다.
>
> **(2) 디렉터리를 fractal로 만드는 것은 `INTENT.md`의 존재 또는 index 파일의 존재다.** 어댑터가 임의 파일을 "진입점"으로 보고했다는 사실만으로 fractal이 되지 않는다. 이 둘 중 어느 것도 없으면 organ이다.
>
> **(3) `SKILL.md` 같은 markdown-as-implementation은 진입점이 아니다.** 스킬과 에이전트는 md 자체가 구현이며, 코드에 맞춰진 FCA 규칙을 그대로 적용하면 의미가 와전된다. `skills/`는 organ이 맞고 INTENT.md를 두지 않는다.

자동 분류 우선순위는 다음으로 고정한다.

1. INTENT.md 또는 DETAIL.md가 있으면 `fractal`
2. config를 포함한 known organ name이면 `organ`
3. `__name__` 또는 `.name` infrastructure pattern이면 `organ`
4. StructureAdapter가 **module index**를 보고하면 `fractal`
5. 어댑터가 side-effect 없음과 stateless를 확정하면 `pure-function`
6. 그 밖에는 `organ`

우선순위 4가 보는 것은 **module index 하나뿐이다.** 어댑터가
`EntryPointDescriptor`로 보고하는 값 중 `kind: "module"`만 분류에 쓰이며,
`kind: "executable"`이나 `kind: "framework"`, 그리고 config의
`entryPointOverrides`가 주입한 경로는 분류를 바꾸지 못한다. core는 여전히
파일명을 모른다 — "여기에 module index가 있는가"를 어댑터에 물을 뿐이다.

`entryPointOverrides`는 `entry-point-surface` 규칙의 입력이지 분류 입력이
아니다. 이 구분이 없으면 `SKILL.md` 같은 markdown-as-implementation이
디렉터리를 fractal로 만들어 코드용 규칙을 md에 적용하게 된다.

우선순위 6이 `organ`인 것이 이 개정의 핵심이다. 문서도 index도 없는
디렉터리는 독립 계약을 선언한 적이 없으므로 fractal이 아니다. 이전 규범은
기본값을 `fractal`로 두어 "INTENT.md를 추가하라"는 요구를 자동 생성했고,
그 결과 `skills/setup`처럼 하위 디렉터리를 가졌다는 이유만으로 md 묶음이
fractal이 되는 임의성이 생겼다.

기본 known organ name은 `components`, `utils`, `types`, `hooks`, `helpers`,
`lib`, `styles`, `assets`, `constants`, `test`, `tests`, `spec`, `specs`,
`fixtures`, `e2e`, `references`다. 이름 목록은 언어 문법이 아니라 FCA
compartment convention이며 config로 확장한다. organ 아래도 traversal을
중단하지 않는다. 그 안에서 문서나 entry point를 가진 하위 디렉터리는
독립 fractal로 다시 분류한다.

### INTENT.md

- 최대 50줄과 `Always do` / `Ask first` / `Never do` 경계를 유지한다.
- 상위 문서를 복제하지 않고 해당 프랙탈의 목적·소유권·경계만 기록한다.
- organ에는 두지 않는다.
- 외부 계약이나 경계가 바뀔 때만 갱신한다.
- 특정 언어의 진입점 이름을 규범 문장에 넣지 않는다. 실제 경로는 Structure
  섹션에 어댑터가 관찰한 값으로 기록할 수 있다.

### DETAIL.md

DETAIL.md가 현재 계약과 acceptance criteria의 단일 진실 공급원이다.

필수 섹션은 다음 네 개다.

```md
## Requirements

## API Contracts

## Acceptance Criteria

## Last Updated
```

`## Acceptance Criteria` 아래 그룹은 해당 DETAIL.md 안에서 고유한 안정 ID를
가진다.

```md
### AC-structure-placement — Shared unit placement

- Observable: ...
- Expected: ...
```

- DETAIL.md는 append-only history가 아니다. 현재 상태로 재구성한다.
- `.filid/criteria.md`는 1.0에서 별도 원장이 아니다.
- 기존 `.filid/criteria.md`가 발견되면 자동 삭제·자동 변환하지 않는다.
  `legacy-criteria-ledger` finding과 해당 claim을 옮길 DETAIL.md 경로를
  보고한다.
- migration 완료 후 사용자가 원본을 제거하며, cross-review는 DETAIL.md만
  acceptance oracle로 읽는다.

## 검증 문서 모델

core는 파일명이나 확장자가 아니라 다음 역할을 안다.

```ts
export type VerificationRole = "spec-document" | "test-record";
export type AnalysisCertainty = "exact" | "indeterminate" | "unsupported";

export interface VerificationCaseCount {
  certainty: AnalysisCertainty;
  exactCount?: number;
  knownLowerBound: number;
  reasons: string[];
}

export interface VerificationFileAnalysis {
  path: string;
  adapterId: string;
  role: VerificationRole;
  count: VerificationCaseCount;
  ownerFractalPath: string;
  contractGroupIds: string[];
}

export interface VerificationViolation {
  ruleId:
    | "spec-document-case-cap"
    | "test-record-case-cap"
    | "spec-fragmentation"
    | "spec-contract-link";
  path: string;
  severity: "error" | "warning";
  message: string;
}

export interface VerificationAdapter {
  id: string;
  detect(projectRoot: string): Promise<AdapterClaim>;
  discover(projectRoot: string): Promise<string[]>;
  classify(filePath: string): Promise<VerificationRole | "unsupported">;
  count(filePath: string): Promise<VerificationCaseCount>;
  extractContractGroupIds(filePath: string): Promise<string[]>;
}
```

### spec-document

- 현재 실행 가능한 계약 문서다.
- 파일 하나의 의미론적 case 최대값은 **15**다.
- 3 basic + 12 complex 분할은 규칙이 아니다.
- 누적 기록이 아니라 현재 계약을 압축해서 보여준다.
- 여러 spec-document는 허용하지만 cap 회피용 분할은 금지한다.
- 한 소유 프랙탈에 spec-document가 여러 개면:
  1. 그 프랙탈에 DETAIL.md가 있어야 한다.
  2. 모든 spec-document가 하나 이상의 DETAIL acceptance group ID를
     선언해야 한다.
  3. 서로 다른 파일의 ID 집합은 겹치면 안 된다.
  4. 선언 ID는 실제 DETAIL.md에 존재해야 한다.
- 같은 계약 그룹을 `part1`, `part2`처럼 나눈 경우 `spec-fragmentation`
  위반이다.
- 계약 연결 토큰은 `filid:contract <acceptance-group-id>`다. core는 토큰과
  ID만 알고, 각 VerificationAdapter가 해당 언어의 주석 또는 metadata에서
  토큰을 추출한다. 한 파일에서 토큰을 반복해 여러 group을 선언할 수 있다.

### test-record

- QA, 회귀, 장애 재현, 스펙 히스토리를 보존하는 기록이다.
- 파일 총수와 프로젝트 전체 case 총수에는 제한이 없다.
- 파일 하나의 의미론적 case 최대값은 **32**다.
- 32개를 넘으면 동작/사건별로 파일을 분리하며 coverage를 삭제하지 않는다.
- test-record는 시간이 지나 spec-document로 promotion되지 않는다.

### case 계산

- 일반 case 선언, skip, todo는 각각 1개다.
- 정적으로 열거된 parameterized rows는 행 수만큼 센다.
- 정적인 parameterized suite 안의 case는 suite row 수를 곱한다.
- property test 선언은 생성 시행 횟수와 무관하게 1개다.
- 동적 table, 사용자 wrapper, 해석 불가능한 alias가 개수에 영향을 주면
  `indeterminate`다.
- `indeterminate`와 `unsupported`는 절대 PASS로 변환하지 않는다.
- 초기 어댑터의 호출 문법, 확장자, 주석 문법은 해당 어댑터 안에만 둔다.

## 언어·생태계 어댑터

### 공통 계약

```ts
export interface AdapterClaim {
  confidence: number;
  evidence: string[];
}

export interface DependencyReference {
  sourceFile: string;
  rawSpecifier: string;
  resolvedPath: string | null;
  kind: "static" | "dynamic" | "re-export" | "framework";
}

export interface EntryPointInspection {
  entryPoint: EntryPointDescriptor;
  exportedNames: string[];
  hasDirectDeclarations: boolean;
  certainty: AnalysisCertainty;
}

export interface StructureAdapter {
  id: string;
  detect(projectRoot: string): Promise<AdapterClaim>;
  discoverSourceFiles(projectRoot: string): Promise<string[]>;
  findEntryPoints(directoryPath: string): Promise<EntryPointDescriptor[]>;
  inspectEntryPoint(entryPointPath: string): Promise<EntryPointInspection>;
  extractDependencies(filePath: string): Promise<DependencyReference[]>;
  isFrameworkOwnedPeer(filePath: string): Promise<boolean>;
  suggestEntryPointPath(directoryPath: string): Promise<string>;
}

export interface AdapterRegistry {
  registerStructure(adapter: StructureAdapter): void;
  registerVerification(adapter: VerificationAdapter): void;
  resolveStructure(projectRoot: string): Promise<StructureAdapter[]>;
  resolveVerification(projectRoot: string): Promise<VerificationAdapter[]>;
}
```

- confidence가 동일한 두 어댑터가 같은 파일을 소유한다고 주장하면
  `ambiguous-adapter-claim` 오류다.
- 어느 어댑터도 파일을 소유하지 않으면 `unsupported`다.
- 요청된 어댑터 ID가 등록되지 않았으면 config warning이 아니라 명시적
  validation finding으로 반환한다.
- 새 어댑터 추가로 core types, policy rule, MCP schema가 바뀌면 설계 위반이다.

### 초기 어댑터

`src/adapters/ecmascript/`가 현재 저장소 생태계를 담당한다. 파일 확장자,
진입점 후보, framework convention, import/export 문법, spec/test 탐색 패턴과
case 호출 문법은 이 디렉터리 밖으로 새지 않는다.

외부 native parser는 사용하지 않는다. 작은 lexical scanner로 문자열·주석과
괄호 nesting을 구분하고, 확실히 계산할 수 없는 구조는 `indeterminate`로
반환한다. 정확성보다 억지 PASS를 피하는 것이 우선이다.

## 설정 계약

1.0 config schema version은 `2.0`이다.

```ts
export interface FilidConfigV2 {
  version: "2.0";
  language?: string;
  adapters: {
    mode: "auto" | "explicit";
    enabled: string[];
  };
  rules: Record<string, RuleOverride>;
  structure?: {
    maxDepth?: number;
    additionalOrganNames?: string[];
    additionalAllowedPeers?: AllowedPeerOverride[];
    entryPointOverrides?: Record<string, string[]>;
  };
}

export interface AllowedPeerOverride {
  basename: string;
  paths?: string[];
  adapterId?: string;
}
```

- `language`는 문서 출력 언어이며 프로그래밍 언어 선택값이 아니다.
- `auto`는 등록 어댑터의 claim을 사용한다. `explicit`은 `enabled`에 든
  어댑터만 사용하며 빈 배열은 validation error다.
- `entryPointOverrides`의 key는 adapter ID다. core가 파일명 의미를 해석하지
  않고 해당 어댑터에 전달한다.
- v1 config는 읽을 때 메모리에서 v2로 변환하고 `config-migration-required`
  진단을 낸다. 자동으로 파일을 쓰지 않는다.
- 기존 organ/depth/allowed/entry-point 값은 대응하는 v2 필드로 옮긴다.
  제거된 naming rule, route pattern, CC/LCOM4/promotion 설정은 버리고 각 key를
  migration diagnostic에 기록한다.
- 사용자가 `setup`의 설정 저장을 승인할 때만 v2를 디스크에 기록한다.

## 프로젝트 snapshot과 DAG

모든 scan, validate, plan은 동일한 snapshot을 소비한다.

```ts
export interface ProjectSnapshot {
  schemaVersion: 1;
  projectRoot: string;
  outputLanguage: string;
  snapshotHash: string;
  tree: FractalTree;
  dependencyGraph: DependencyGraph;
  adapterIds: string[];
  verification: VerificationProjectAnalysis;
  legacyCriteriaLedger: LegacyCriteriaLedgerEvidence | null;
  diagnostics: SnapshotDiagnostic[];
  createdAt: string;
}

export interface LegacyCriteriaLedgerEvidence {
  path: string;
  targetDetailPath: string;
}

export interface DependencyEvidence {
  sourceFile: string;
  rawSpecifier: string;
  resolvedPath: string;
}

export interface DependencyGraphEdge {
  fromFractalPath: string;
  toFractalPath: string;
  evidence: DependencyEvidence[];
}

export interface DependencyGraph {
  nodePaths: string[];
  edges: DependencyGraphEdge[];
  cycles: string[][];
  certainty: AnalysisCertainty;
}

export interface VerificationProjectAnalysis {
  files: VerificationFileAnalysis[];
  violations: VerificationViolation[];
  certainty: AnalysisCertainty;
}

export interface SnapshotDiagnostic {
  code: string;
  message: string;
  path?: string;
}
```

- snapshot hash는 정렬된 상대 경로와 구조 판정에 사용된 파일 내용의 SHA-256을
  결합한다. mtime만으로 판정하지 않는다.
- legacy `.filid/criteria.md`가 존재하면 snapshot은 절대 ledger path와
  migration target인 root `DETAIL.md` path를 evidence로 보존하고 ledger
  내용도 snapshot hash 입력에 포함한다. project-granularity
  `legacy-criteria-ledger` rule이 이를 violation으로 변환한다.
- `outputLanguage`는 snapshot 생성에 사용한 config의 문서 출력 언어이며
  `context_resolve`가 별도 config 재조회 없이 그대로 반환한다.
- dependency edge는 source file, raw specifier, source/target owner fractal을
  증거로 가진다.
- 외부 소비자는 대상 **fractal**의 어댑터 진입점만 참조해야 한다.
- 같은 fractal 내부 파일은 local entry point를 경유하지 않고 구체 내부 파일을
  직접 참조한다.
- 형제 fractal은 대상 형제의 진입점을 참조하며 부모 barrel로 우회하지 않는다.
- **organ 참조는 소비자 위치로 판정한다.** organ은 진입점을 갖지 않으므로
  "organ의 진입점을 경유하라"는 요구는 성립하지 않는다. 대신:

  | 소비자 위치              | 참조 경로                     | 판정                              |
  | ------------------------ | ----------------------------- | --------------------------------- |
  | 소유 프랙탈의 subtree 안 | organ의 구체 파일 직접 import | OK                                |
  | subtree 밖               | **소유 프랙탈의 index 경유**  | OK — 단 LCA 미이동 사유 필요      |
  | subtree 밖               | organ의 구체 파일 직접 import | 위반 — 단 선언된 면책이 있으면 OK |

- subtree 안에서는 중첩된 하위 fractal이 organ의 구체 파일을 직접 참조하는
  것이 정상이며 위반이 아니다.
- 소유 프랙탈의 index가 organ 심볼을 재수출하면 외부 소비가 적법하다. 다만
  **그 organ이 소비자들의 LCA로 이동하지 않은 이유가 있어야 한다.** 외부
  소비자를 가진 단위의 자연스러운 자리는 그 소비자들의 LCA이며, 제자리에
  남는 것은 의도적 선택이므로 근거를 남긴다.
- 직접 import 면책이 필요한 실제 사례가 있다. **index를 경유하면 불필요한
  코드가 딸려오는 경우** — 훅 스크립트가 대표적이다. 배럴을 거치면 번들러가
  배럴이 재수출하는 모듈 전체를 훅 번들로 끌어온다. 이때는 구체 파일 직접
  import가 옳으며, 면책은 사유와 함께 선언된다.
- 이 구분이 cycle 판정에도 적용된다. 자식 fractal이 부모 소유 organ을
  참조하는 것은 부모로 향하는 의존 edge가 아니다. 그렇게 승격하면 부모
  barrel이 자식을 재수출하는 정상적인 FCA 형태가 순환으로 오판된다.
- `circular-dependency`는 snapshot graph의 실제 cycle을 반환한다. 그래프를
  만들 수 없는 파일이 cycle 결과에 영향을 줄 수 있으면 전체 결과는
  `indeterminate`다.

## 컨텍스트 해석

`context_resolve`는 문서 본문을 대량 반환하지 않고, 대상의 소유 프랙탈과
leaf-to-root 문서 경로를 결정한다.

```ts
export interface ContextDocumentRef {
  fractalPath: string;
  intentPath: string | null;
  detailPath: string | null;
  intentLines?: number;
  documentStatus: "valid" | "violations" | "missing";
}

export interface ContextResolution {
  targetPath: string;
  ownerFractalPath: string;
  chain: ContextDocumentRef[];
  nearestDetailPath: string | null;
  outputLanguage: string;
}

export function resolveContext(
  snapshot: ProjectSnapshot,
  targetPath: string,
): ContextResolution;
```

chain 순서는 owner에서 root 방향이다. 본문은 반환하지 않으며 호출자가 필요한
경로만 읽는다. target이 project root 밖이거나 owner를 결정할 수 없으면
명시적 오류이며 root 문서를 임의 fallback으로 선택하지 않는다.

## LCA와 재구조화

LCA는 문자열 공통 prefix가 아니라 **소비자 소유 프랙탈들의 가장 낮은 공통
fractal**이다.

```ts
export function findLowestCommonFractal(
  tree: FractalTree,
  consumerPaths: string[],
): FractalNode | null;
```

판정 순서는 다음과 같다.

1. 각 consumer file/directory를 소유하는 fractal로 올린다.
2. 모든 소유 fractal의 ancestor chain 교집합을 구한다.
3. 가장 깊은 `fractal`을 선택한다. organ은 LCA가 될 수 없다.
4. 독립 공개 계약 증거가 있으면 LCA 아래 새 fractal을 제안한다.
5. 독립 계약이 없으면 LCA 아래 organ을 제안한다.
6. 단일 소비자면 그 소비자의 소유 fractal 아래 organ이 기본이다.
7. 의미 있는 organ 이름을 구조 증거로 결정할 수 없으면 target 후보를
   반환하되 `requiresDecision: true`로 강제한다. 자동으로 `shared`나
   `common` grab-bag을 만들지 않는다.

### 이동 계획 계약

```ts
export type PlacementBasis =
  | "single-owner"
  | "lowest-common-fractal"
  | "public-contract"
  | "boundary-rule";

export interface RequiredArtifact {
  role: "intent-document" | "detail-document" | "entry-point";
  path: string;
  adapterId?: string;
}

export interface ImportRewrite {
  consumerPath: string;
  currentSpecifier: string;
  requiredSpecifier: string;
}

export interface ImportRewriteBuildResult {
  rewrites: ImportRewrite[];
  decisionReasons: RestructureDecisionReason[];
}

export interface PlacementRequest {
  sourcePath: string;
  consumerPaths?: string[];
  contractIntent?: "internal" | "independent" | "unknown";
  organNameHint?: string;
}

export interface RestructurePlanInput {
  path: string;
  requests: PlacementRequest[];
}

export interface MoveInstruction {
  sourcePath: string;
  targetPath: string;
  unitKind: "file" | "organ" | "fractal";
  targetNodeType: "organ" | "fractal" | "pure-function" | "undetermined";
  basis: PlacementBasis;
  consumerPaths: string[];
  lowestCommonFractalPath?: string;
  reason: string;
  requiredArtifacts: RequiredArtifact[];
  affectedImports: ImportRewrite[];
  requiresDecision: boolean;
  decisionReasons: string[];
}

export interface RestructurePlan {
  schemaVersion: 1;
  planId: string;
  projectRoot: string;
  snapshotHash: string;
  createdAt: string;
  moves: MoveInstruction[];
  unresolved: MoveInstruction[];
  summary: {
    moveCount: number;
    fractalsCreated: number;
    organsCreated: number;
    decisionsRequired: number;
  };
}

export interface PlanValidationFinding {
  code: string;
  message: string;
  path?: string;
  sourcePath?: string;
}

export interface PlanValidationResult {
  valid: boolean;
  findings: PlanValidationFinding[];
}
```

- 모든 machine path는 정규화된 절대 경로다.
- machine path의 비교, containment, relative/join/resolve는
  `@ogham/cross-platform`의 portable API를 사용해 현재 host OS와 무관하게
  Windows/POSIX 경로 의미를 보존한다.
- `requiredArtifacts`는 역할과 실제 경로를 함께 반환한다. core DTO에는
  특정 언어의 진입점 파일명이 없다.
- 새 fractal의 entry point artifact는 snapshot에 이미 보존된
  adapter-reported entry point 경로 형태에서만 파생한다. exact evidence가
  없으면 이름을 추측하지 않고 해당 move를 unresolved로 반환한다.
- `contractIntent: "unknown"`에서 독립성 증거가 없으면
  `targetNodeType: "undetermined"`로 반환한다. unresolved move의 target은
  실행 지시가 아니라 LCA 아래의 검토 후보이며 자동 organ 선택이 아니다.
- `affectedImports.requiredSpecifier`는 현재 raw specifier가 source machine
  path를 exact하게 지시하는 path-like evidence일 때만 portable relative
  target으로 산출한다. alias, runtime-extension mapping 등 adapter 의미가
  필요한 경우에는 추측하지 않고 move를 unresolved로 반환한다.
- `restructure_plan`은 프로젝트 파일을 쓰거나 옮기지 않는다. 임시 artifact
  저장만 허용한다.
- 외부 LLM/도구가 계획을 실행한다.
- 실행 직전 `plan-precondition`은 snapshot hash 일치를 검사한다.
- 실행 후 `plan-postcondition`은 source 부재, target 존재, node type,
  필수 문서, 진입점, import boundary, DAG와 모든 import rewrite를 검사한다.
- 사후 snapshot hash는 이동 때문에 달라지는 것이 정상이다. postcondition에서
  pre-execution hash 일치를 요구하지 않는다.
- 계획과 다른 target으로 옮긴 경우 결과가 기능적으로 동작해도 FAIL이다.
- `validatePlanPreconditions(snapshot, plan)`과
  `validatePlanPostconditions(snapshot, plan)`은 `PlanValidationResult`를
  반환하며 모든 finding이 없을 때만 `valid: true`다.

## MCP 반환 계약

모든 도구는 공통 envelope를 쓴다.

```ts
export type ToolStatus = "ok" | "violations" | "indeterminate" | "unsupported";

export interface ToolArtifact {
  path: string;
  mediaType: "application/json" | "application/x-ndjson" | "text/markdown";
  sha256: string;
  bytes: number;
  ephemeral: true;
}

export interface ToolDiagnostic {
  code: string;
  message: string;
  path?: string;
}

export interface ToolPayload<Summary, Data> {
  projectRoot: string;
  status: ToolStatus;
  summary: Summary;
  data?: Data;
  diagnostics: ToolDiagnostic[];
  persistence?: "on-overflow" | "always";
}

export interface ToolResultEnvelope<Summary, Data> {
  status: ToolStatus;
  summary: Summary;
  data?: Data;
  artifact?: ToolArtifact;
  diagnostics: ToolDiagnostic[];
}
```

- 기본 inline 예산은 UTF-8 기준 **16 KiB**다.
- 예산을 넘으면 `data`를 빼고 전체 payload를 plugin cache의
  `artifacts/<tool-name>/<sha256>.json`에 atomic write한다.
- artifact와 inline text는 동일한 compact serializer를 사용하며 `Map`과
  `Set` 정규화, byte 계산, SHA-256 입력이 모두 그 직렬화 결과를 기준으로 한다.
- artifact path는 lexical containment와 symlink-descendant 검사를 모두
  통과한 뒤에만 쓴다.
- `persistence: always`인 restructure plan은 크기와 관계없이 artifact를 남긴다.
- `persistence: always`인 payload는 저장된 full payload를 단일 data source로
  사용하고 inline envelope의 `data`를 생략한다.
- `data` 제거 후 실제 inline envelope도 다시 byte-check한다. diagnostics가
  예산을 넘기면 full diagnostics는 artifact에만 두고 bounded diagnostic으로
  대체한다. summary와 artifact metadata만으로도 예산을 넘으면 안정적
  structured tool error를 반환하며 16 KiB 상한을 깨지 않는다.
- inline JSON은 들여쓰기 없이 직렬화한다.
- artifact는 임시 자료이며 장기 원장이 아니다. 없어진 경우 snapshot을 다시
  만들고 계획을 재생성한다.
- `structure_validate`는 canonical full-payload artifact의 `data`에서
  `RestructurePlan`을 읽는다. 이행 characterization을 위해 기존 bare-plan
  artifact도 같은 validator schema로 계속 읽을 수 있다.
- 반환이 길어질 가능성이 있는 모든 새 도구는 이 envelope를 우회할 수 없다.
- `toolResult(toolName, payload)`가 tool name과 payload를 받아 materialize와
  compact MCP text 직렬화를 수행한다.
- SDK에 광고하는 input schema는 object 형태를 유지하되 사전 오류를 callback
  경계까지 전달한다. `wrapHandler(toolName, exactSchema, handler)`가 exact
  schema를 검증하고 parse failure까지 공통 `toolError` envelope로 바꾼다.

## 목표 MCP 표면

1.0은 아래 9개만 노출한다.

| 도구                 | 입력의 핵심                                | 기본 반환                        | 역할                     |
| -------------------- | ------------------------------------------ | -------------------------------- | ------------------------ |
| `project_init`       | project path, output language, adapter IDs | 생성된 config 경로 요약          | FCA 초기화               |
| `rule_docs_sync`     | status/sync/manifest, project path         | 배포 상태 요약                   | managed rule 문서 동기화 |
| `open_settings`      | project path, bounded wait                 | saved/closed/pending             | 설정 UI                  |
| `fractal_scan`       | path, depth, detail                        | summary                          | snapshot/tree 검사       |
| `context_resolve`    | project path, target path                  | owner와 INTENT/DETAIL 경로 chain | 최소 컨텍스트 탐색       |
| `restructure_plan`   | path, placement requests                   | 요약 + 항상 plan artifact        | 이동 위치 결정           |
| `structure_validate` | path, mode, scopes, plan path              | 위반 요약 + 필요 시 artifact     | 프로젝트/계획 검증       |
| `verification_scan`  | path, optional file paths, detail          | 15/32/fragmentation 요약         | 검증 문서 판정           |
| `review_state`       | prepare/checkpoint/seal/cleanup            | review artifact 상태             | cross-review bookkeeping |

`verification_scan.summary`는 `specDocument`와 `testRecord`별
`fileCount`, `knownCaseCount`, `caseCap`을 분리하고 전체
`fragmentationCount`, `violationCount`, certainty를 함께 반환한다.
`rule_docs_sync`의 status/manifest에서 plugin root를 해석하지 못한 경우는
`ok`가 아니라 `unsupported`와 안정적 diagnostic을 반환한다.

`structure_validate.mode`은 정확히 다음을 허용한다.

```ts
type StructureValidationMode =
  "project" | "plan-precondition" | "plan-postcondition";
```

`structure_validate.scopes`은
`documents | nodes | entry-points | boundaries | dag | verification`이다.
생략하면 전부 검사한다. plan mode에서는 `planPath`가 필수다.

핵심 도구 입력은 다음과 같이 고정한다.

```ts
export interface FractalScanInput {
  path: string;
  depth?: number;
  detail?: "summary" | "paths" | "full";
}

export interface ContextResolveInput {
  path: string;
  targetPath: string;
}

export interface VerificationScanInput {
  path: string;
  filePaths?: string[];
  detail?: "summary" | "files";
}

export interface StructureValidateInput {
  path: string;
  mode?: StructureValidationMode;
  scopes?: Array<
    | "documents"
    | "nodes"
    | "entry-points"
    | "boundaries"
    | "dag"
    | "verification"
  >;
  planPath?: string;
}

export type ReviewStateInput =
  | {
      action: "prepare";
      projectRoot: string;
      branchName: string;
      baseRef: string;
      force?: boolean;
    }
  | {
      action: "checkpoint" | "seal";
      projectRoot: string;
      branchName: string;
      baseRef?: string;
    }
  | {
      action: "cleanup";
      projectRoot: string;
      branchName: string;
      confirm: true;
    };
```

review state의 persisted/output 계약은 다음으로 고정한다.

```ts
export type ReviewStatePhase = "prepared" | "sealed";
export type ReviewStateDisposition =
  "fresh" | "resumable" | "cached" | "stale" | "missing" | "sealed" | "cleaned";

export interface ReviewStateRecord {
  schemaVersion: 1;
  projectRoot: string;
  branchName: string;
  normalizedBranch: string;
  baseRef: string;
  baseCommit: string;
  sourceHash: string;
  fileHashes: Record<string, string>;
  phase: ReviewStatePhase;
  preparedAt: string;
  sealedAt?: string;
}
```

- `prepare`는 새 state면 `fresh`, 같은 hash의 prepared state면 `resumable`,
  같은 hash의 sealed state와 report가 있으면 `cached`다. `force: true`는
  cache를 사용하지 않고 fresh prepared state를 쓴다.
- `checkpoint`는 state 부재 `missing`, hash 불일치 `stale`, matching prepared
  `resumable`, matching sealed+report `cached`다. state, review directory,
  정렬된 canonical artifact file 목록과 optional report path를 반환한다.
- `seal`은 matching prepared hash와 review report가 있을 때만 state를
  `sealed`로 바꾸고 disposition `sealed`을 반환한다.
- `cleanup`은 literal `confirm: true` 뒤 branch directory만 제거하고
  disposition `cleaned`을 반환한다.
- `stale`과 `missing`은 `ok` status가 아니며 message parsing 없이 stable
  disposition과 diagnostics로 판정할 수 있어야 한다.

- `restructure_plan`은 위 `RestructurePlanInput`을 그대로 쓴다.
- 생략된 `consumerPaths`는 dependency graph의 incoming edge로 계산한다.
- `contractIntent`가 생략되면 `unknown`이다. 문서/public surface 증거가
  독립성을 확정하지 못하면 unresolved이며 자동으로 organ을 선택하지 않는다.
- `organNameHint`는 이름 제안일 뿐, LCA와 boundary postcondition을 바꾸지
  못한다.

다음 현행 도구는 제거 또는 대체한다.

| 현행 도구                             | 결론                                             |
| ------------------------------------- | ------------------------------------------------ |
| `ast_analyze`                         | 제거 — 일반 코드 품질/AST 분석                   |
| `ast_grep_search`, `ast_grep_replace` | 제거 — 범용 LLM/검색 도구 영역                   |
| `fractal_navigate`                    | `fractal_scan` + `context_resolve`로 대체        |
| `doc_compress`                        | 제거 — 입력 content가 토큰을 절약하지 않음       |
| `test_metrics`                        | `verification_scan`으로 의미 재설계              |
| `drift_detect`                        | `restructure_plan`으로 대체                      |
| `lca_resolve`                         | MCP에서는 제거, core의 multi-consumer LCA로 흡수 |
| `rule_query`                          | `structure_validate`와 rule 문서로 대체          |
| `config_patch_validate`               | settings/project-init 내부 검증으로 흡수         |
| `coverage_verify`                     | 제거 — 테스트 품질은 Seiri 영역                  |
| `debt_manage`                         | 제거 — FCA core가 아닌 별도 debt workflow        |
| `cache_manage`                        | 제거 — 내부 infra로만 유지                       |
| `review_manage`                       | 축소 후 `review_state`로 대체                    |

## 목표 스킬 표면

> **개정 (2026-07-28)**: 최초 계획은 스킬을 8개로 줄이면서 merge-track 절차
> 전체(`pull-request` → `cross-review` → `resolve` → `revalidate`)와 이를 잇는
> `pipeline`을 제거했다. 소유자 판단으로 **이 다섯은 제품의 필수 부속이다.**
> 브랜치가 머지될 때 PR 형식·리뷰 형식·수정 형식·재검증 형식이 모두 지켜져야
> 하며, `pipeline`의 auto 흐름이 주 사용 경로다. 따라서 유지 스킬은 **12개**다.
>
> 다만 되살리는 네 스킬은 제거된 도구에 의존했으므로 **원본 복원이 아니라 9개
> 도구 표면 위로 재작성**한다. `review_manage` → `review_state`,
> `ast_analyze`/`test_metrics` → `verification_scan`·`structure_validate`.
>
> **역할 변경**: `resolve`는 더 이상 자체 코드작성 에이전트를 갖지 않는다.
> 수용된 수정의 적용은 메인 에이전트 또는 다른 플러그인에 위임하고, `resolve`는
> **수용/거부 결정과 그 기록이라는 절차만** 소유한다. 이것이 "MCP가 코드 수정을
> 대신하지 않는다"는 비목표와 양립하는 형태다.

유지하는 사용자 스킬은 12개다.

| 스킬            | 1.0 책임                                                     |
| --------------- | ------------------------------------------------------------ |
| `setup`         | config/rule docs 초기화, snapshot 후 누락 INTENT/DETAIL 제안 |
| `scan`          | 유일한 전체 FCA audit 진입점                                 |
| `context-query` | `context_resolve`로 최소 문서 chain 탐색                     |
| `guide`         | 현재 tree와 placement 규칙 설명                              |
| `enrich-docs`   | INTENT/DETAIL 품질 개선; 승인 후 LLM이 편집                  |
| `restructure`   | plan → 승인 → 외부 실행 → postcondition                      |
| `migrate`       | legacy 문서명을 INTENT/DETAIL로 옮기는 명시적 migration      |

merge-track 절차 4개와 오케스트레이터 1개를 함께 유지한다.

| 스킬           | 1.0 책임                                                        |
| -------------- | --------------------------------------------------------------- |
| `pull-request` | PR 형식을 지켜 브랜치에서 PR을 만든다                           |
| `cross-review` | FCA 증거 기반 3관점 review와 adversarial 판정                   |
| `resolve`      | fix 항목별 수용/거부 결정과 거부 사유 기록. **적용은 위임한다** |
| `revalidate`   | 수정 후 delta 재측정과 PASS/FAIL 재판정                         |
| `pipeline`     | 위 넷을 `--auto`로 연속 실행하는 오케스트레이터                 |

이 다섯은 하나의 라이프사이클이다. 각 단계의 **형식**(PR 본문, 리뷰 보고서,
fix 요청, 재검증 결과)이 계약이며, 형식이 지켜지지 않으면 다음 단계가 입력을
잃는다.

다음 스킬은 제거한다.

- `ast-fallback`: 제거된 AST 기능의 fallback이다. 원래 기능이 없으므로 fallback도
  대상이 없다.
- `structure-review`: `scan`(전체 감사)과 `cross-review`(변경 감사)가 이미 그
  범위를 나눠 갖는다. 세 번째 진입점은 어느 쪽을 써야 하는지만 모호하게 만든다.
- `promote`: spec-document와 test-record는 서로 다른 문서 역할이며 승격 관계가
  아니다(ADR-06). 승격이라는 동작 자체가 1.0 모델에 존재하지 않는다.
- `harvest`: acceptance 원장을 DETAIL.md 하나로 통일했으므로(ADR-05)
  `.filid/criteria.md`에 claim을 수확해 넣을 대상이 없다. spike lifecycle은
  일반 개발 workflow로 되돌린다.
- `sync`: 한 스킬이 구조 이동과 문서 갱신을 동시에 하면 어느 쪽이 실패했는지
  구분되지 않는다. 구조는 `restructure`(계획·승인·검증), 문서는
  `enrich-docs`(승인 후 편집)로 분리한다. 두 절차의 승인 지점이 다르다.
- `update`: 코드 변경 뒤 문서와 테스트를 자동 재작성하는 workflow다. 자동
  재작성은 승인 지점이 없어 "무엇이 왜 바뀌었는지"가 남지 않는다. 같은 목적은
  `enrich-docs`(승인 후 문서 편집)가 수행한다.
- `config-wizard`: config 관리는 `project_init`(생성)과 `open_settings`(조회·수정)
  두 MCP 도구가 이미 소유한다. **이 스킬이 없어도 config 관리가 동작해야 하며,
  그 조건은 settings UI가 v2를 round-trip 저장하는 것이다.**

## cross-review 1.0

cross-review가 읽는 증거는 다음으로 제한한다.

- 변경된 프랙탈의 INTENT.md와 DETAIL.md 계약
- node classification과 owner
- entry point surface와 외부 import boundary
- dependency DAG와 cycle
- LCA placement 및 승인된 restructure plan 사후조건
- spec-document 15, test-record 32
- spec fragmentation과 DETAIL acceptance group link
- `unsupported`/`indeterminate` 진단

고정 관점은 세 개다.

1. **contract**: INTENT/DETAIL/acceptance/public surface
2. **structure**: classification/boundary/DAG/LCA/placement
3. **verification**: role/case count/fragmentation/link/certainty

세 관점은 한 번 병렬 의견을 내고, 별도 adversarial verifier가 모든 blocking
finding을 `CONFIRMED | PLAUSIBLE | REFUTED`로 판정한다. REFUTED는 verdict에서
제거하되 보고서 arbitration log에 남긴다.

- cross-review는 코드를 고치거나 이동하지 않는다.
- 구조 finding은 `restructure_plan`이 반환한 Current/Target/Type/Basis/LCA를
  그대로 인용한다.
- generic persona agent 파일과 committee election은 제거한다. 역할 프롬프트는
  `skills/cross-review/reviewers/`의 작은 reference로 둔다.
- verdict는 `APPROVED | REQUEST_CHANGES | INCONCLUSIVE`를 유지하되, 보고서
  제목과 본문에 “FCA scope”를 명시한다.
- evidence가 `indeterminate`인데 merge 안전성을 판정할 수 없으면
  `INCONCLUSIVE`, 명확한 위반이면 `REQUEST_CHANGES`다.
- PR comment는 사용자가 PR scope를 요청했을 때만 수행한다.

## 1.0 built-in rule 집합

| Rule ID                    | 소유 증거                          | 결과                                                     |
| -------------------------- | ---------------------------------- | -------------------------------------------------------- |
| `intent-document-contract` | INTENT parser                      | 50줄/3-tier                                              |
| `detail-document-contract` | DETAIL parser                      | 필수 섹션/현재 상태                                      |
| `organ-no-intentmd`        | node classification                | organ의 INTENT 금지                                      |
| `entry-point-surface`      | StructureAdapter                   | 열거 가능한 public surface                               |
| `module-entry-point`       | StructureAdapter                   | fractal/hybrid entry point                               |
| `max-depth`                | tree                               | 설정 depth                                               |
| `circular-dependency`      | dependency graph                   | 실제 cycle 금지                                          |
| `pure-function-isolation`  | dependency graph                   | pure node 격리                                           |
| `zero-peer-file`           | adapter peer roles                 | fractal root peer 제한                                   |
| `external-import-boundary` | dependency graph + entry point     | fractal은 진입점 경유, organ은 소유 subtree 밖 참조 금지 |
| `spec-document-case-cap`   | VerificationAdapter                | 파일별 15                                                |
| `test-record-case-cap`     | VerificationAdapter                | 파일별 32                                                |
| `spec-fragmentation`       | DETAIL groups + verification files | cap 회피 분할 금지                                       |
| `spec-contract-link`       | DETAIL groups + adapter marker     | 다중 spec의 계약 연결                                    |
| `legacy-criteria-ledger`   | ProjectSnapshot legacy evidence    | root DETAIL migration 경고                               |

`naming-convention`, CC, LCOM4, file-size, coverage rule은 Filid built-in에서
제거한다. adapter가 정확히 측정하지 못한 rule은 PASS 대신
`indeterminate` finding을 낸다.

## 구현 계획

각 작업은 독립적으로 review 가능해야 하며, 앞 작업의 공개 계약만 소비한다.
아래 순서를 바꾸지 않는다.

### 작업 0 — 규범과 root 계약을 1.0으로 전환

먼저 수정:

- `plugins/filid/DETAIL.md`
- `plugins/filid/INTENT.md`
- `plugins/filid/src/INTENT.md`
- `plugins/filid/src/core/DETAIL.md`
- `plugins/filid/src/core/INTENT.md`
- `plugins/filid/src/core/infra/cacheManager/DETAIL.md`
- `plugins/filid/src/core/infra/configLoader/DETAIL.md`
- `plugins/filid/src/mcp/INTENT.md`
- `plugins/filid/src/mcp/server/DETAIL.md`
- `plugins/filid/src/mcp/server/INTENT.md`
- `plugins/filid/src/mcp/tools/debtManage/DETAIL.md`
- `plugins/filid/src/mcp/tools/fractalScan/DETAIL.md`
- `plugins/filid/templates/rules/filid_fca-policy.md`

계약:

- 이 문서의 소유권 표, 15개 rule, 15/32 의미, language-neutral adapter,
  read-only restructure와 FCA-scope cross-review를 반영한다.
- DETAIL.md에 `## Acceptance Criteria`를 추가한다.
- 생성물 `AGENTS.md`는 직접 수정하지 않는다.

검증:

```bash
yarn filid build:rules
yarn filid typecheck
git diff --check
```

첫 명령은 manifest hash를 갱신한다. 세 명령 모두 exit 0이어야 하며,
`templates/rules/manifest.json` diff에는 변경한 canonical rule의 hash만
달라져야 한다.

### 작업 1 — adapter 계약과 language-neutral tree scan

생성:

- `plugins/filid/src/adapters/INTENT.md`
- `plugins/filid/src/adapters/DETAIL.md`
- `plugins/filid/src/adapters/index.ts`
- `plugins/filid/src/adapters/registry/createAdapterRegistry.ts`
- `plugins/filid/src/adapters/registry/resolveAdapters.ts`
- `plugins/filid/src/adapters/ecmascript/INTENT.md`
- `plugins/filid/src/adapters/ecmascript/DETAIL.md`
- `plugins/filid/src/adapters/ecmascript/index.ts`
- `plugins/filid/src/adapters/ecmascript/structure/ecmascriptStructureAdapter.ts`
- `plugins/filid/src/adapters/ecmascript/structure/scanLexicalTokens.ts`
- `plugins/filid/src/adapters/ecmascript/structure/extractDependencyReferences.ts`
- `plugins/filid/src/adapters/ecmascript/structure/findEntryPoints.ts`
- `plugins/filid/src/types/adapters.ts`
- `plugins/filid/src/core/infra/configLoader/loaders/migrateConfigV1.ts`

수정:

- `plugins/filid/src/types/fractal.ts`
- `plugins/filid/src/types/scan.ts`
- `plugins/filid/src/types/index.ts`
- `plugins/filid/src/core/tree/fractalTree/scanner/discoverDirectories.ts`
- `plugins/filid/src/core/tree/fractalTree/scanner/collectNodeMetadata.ts`
- `plugins/filid/src/core/tree/fractalTree/scanner/correctNodeTypes.ts`
- `plugins/filid/src/core/tree/fractalTree/scanner/scanProject.ts`
- `plugins/filid/src/core/tree/organClassifier/organClassifier.ts`
- `plugins/filid/src/core/infra/configLoader/loaders/configSchemas.ts`
- `plugins/filid/src/core/infra/configLoader/loaders/createDefaultConfig.ts`
- `plugins/filid/src/core/infra/configLoader/loaders/configTypes.ts`
- `plugins/filid/src/core/infra/configLoader/loaders/loadConfig.ts`
- `plugins/filid/src/core/infra/configLoader/DETAIL.md`
- `plugins/filid/src/mcp/pages/settings/scripts/app.js`
- `plugins/filid/src/mcp/tools/openSettings/types/settingsTypes.ts`
- `plugins/filid/src/mcp/tools/openSettings/utils/buildSettingsState.ts`
- `plugins/filid/src/mcp/tools/openSettings/utils/persistSave.ts`
- `plugins/filid/src/mcp/tools/projectInit/projectInit.ts`

삭제:

- `plugins/filid/src/core/tree/fractalTree/scanner/detectFrameworks.ts`
- `plugins/filid/src/__tests__/unit/core/detectFrameworks.test.ts`

테스트:

- 생성
  `plugins/filid/src/__tests__/unit/adapters/adapterRegistry.test.ts`
- 생성
  `plugins/filid/src/__tests__/unit/adapters/ecmascriptStructureAdapter.test.ts`
- 수정
  `plugins/filid/src/__tests__/unit/core/fractalTreeScan.test.ts`
- 수정
  `plugins/filid/src/__tests__/unit/core/organClassifierClassify.test.ts`
- 수정
  `plugins/filid/src/__tests__/unit/core/configLoader.test.ts`
- 생성
  `plugins/filid/src/__tests__/unit/core/configRuleDocuments.test.ts`
- 생성
  `plugins/filid/src/__tests__/unit/core/configRootResolution.test.ts`
- 수정
  `plugins/filid/src/__tests__/unit/core/configLoaderSanitize.test.ts`
- 수정
  `plugins/filid/src/mcp/tools/openSettings/__tests__/openSettings.test.ts`
- 수정
  `plugins/filid/e2e/setup-settings.spec.ts`

fail-first:

```bash
yarn filid test:run src/__tests__/unit/adapters/adapterRegistry.test.ts
yarn filid test:run src/__tests__/unit/core/configLoader.test.ts
yarn filid typecheck
```

어댑터가 없는 파일은 `unsupported`, 중복 claim은
`ambiguous-adapter-claim`, core tree가 특정 진입점 이름을 전제하지 않는
assertion이 구현 전 실패하고 구현 후 통과해야 한다.

### 작업 2 — verification-document 15/32 모델

생성:

- `plugins/filid/src/core/verification/INTENT.md`
- `plugins/filid/src/core/verification/DETAIL.md`
- `plugins/filid/src/core/verification/index.ts`
- `plugins/filid/src/core/verification/analyzer/analyzeVerification.ts`
- `plugins/filid/src/core/verification/policy/evaluateVerificationPolicy.ts`
- `plugins/filid/src/core/verification/policy/findSpecFragmentation.ts`
- `plugins/filid/src/core/verification/contracts/resolveContractGroups.ts`
- `plugins/filid/src/adapters/ecmascript/verification/ecmascriptVerificationAdapter.ts`
- `plugins/filid/src/adapters/ecmascript/verification/countSemanticCases.ts`
- `plugins/filid/src/adapters/ecmascript/verification/extractContractGroupIds.ts`
- `plugins/filid/src/types/verification.ts`
- `plugins/filid/src/constants/verificationThresholds.ts`
- `plugins/filid/src/core/rules/documentValidator/validateDetailAcceptanceGroups.ts`

수정:

- `plugins/filid/src/types/documents.ts`
- `plugins/filid/src/types/index.ts`
- `plugins/filid/src/core/rules/documentValidator/documentValidator.ts`
- `plugins/filid/src/core/rules/documentValidator/validateDetailMd.ts`
- `plugins/filid/src/core/rules/documentValidator/INTENT.md`
- `plugins/filid/src/adapters/ecmascript/DETAIL.md`

계약 스펙:

- 생성
  `plugins/filid/src/core/verification/__tests__/verificationPolicy.spec.ts`
  — 15개 이하
- 생성
  `plugins/filid/src/adapters/ecmascript/__tests__/verificationAdapter.spec.ts`
  — 15개 이하
- 생성
  `plugins/filid/src/adapters/ecmascript/__tests__/verificationCounting.test.ts`
  — 32개 이하

필수 fail-first 사례:

- spec 15 PASS / 16 violation
- test-record 32 PASS / 33 violation
- 정적 parameterized 16 rows violation
- dynamic rows `indeterminate`, PASS 아님
- skip/todo 각각 1
- property declaration 1
- 두 spec이 같은 contract group을 참조하면 `spec-fragmentation`
- 서로 다른 DETAIL group이면 PASS
- 여러 spec인데 DETAIL/link가 없으면 violation
- 알 수 없는 파일은 `unsupported`

실행:

```bash
yarn filid test:run src/core/verification/__tests__/verificationPolicy.spec.ts
yarn filid test:run src/adapters/ecmascript/__tests__/verificationAdapter.spec.ts
```

### 작업 3 — snapshot, boundary와 실제 DAG

생성:

- `plugins/filid/src/core/projectSnapshot/INTENT.md`
- `plugins/filid/src/core/projectSnapshot/DETAIL.md`
- `plugins/filid/src/core/projectSnapshot/index.ts`
- `plugins/filid/src/core/projectSnapshot/projectSnapshot.ts`
- `plugins/filid/src/core/projectSnapshot/snapshotHash/computeSnapshotHash.ts`
- `plugins/filid/src/core/contextResolver/INTENT.md`
- `plugins/filid/src/core/contextResolver/DETAIL.md`
- `plugins/filid/src/core/contextResolver/index.ts`
- `plugins/filid/src/core/contextResolver/contextResolver.ts`
- `plugins/filid/src/types/context.ts`
- `plugins/filid/src/core/rules/ruleEngine/utils/checkEntryPointSurface.ts`
- `plugins/filid/src/core/rules/ruleEngine/utils/checkExternalImportBoundary.ts`
- `plugins/filid/src/core/rules/ruleEngine/utils/checkVerificationPolicy.ts`
- `plugins/filid/src/core/analysis/dependencyGraph/DETAIL.md`

수정:

- `plugins/filid/src/types/fractal.ts`
- `plugins/filid/src/types/report.ts`
- `plugins/filid/src/types/rules.ts`
- `plugins/filid/src/types/index.ts`
- `plugins/filid/src/constants/builtinRuleIds.ts`
- `plugins/filid/src/core/analysis/dependencyGraph/buildDag.ts`
- `plugins/filid/src/core/analysis/dependencyGraph/detectCycles.ts`
- `plugins/filid/src/core/analysis/dependencyGraph/dependencyGraph.ts`
- `plugins/filid/src/core/rules/ruleEngine/loadBuiltinRules.ts`
- `plugins/filid/src/core/rules/ruleEngine/evaluateRule.ts`
- `plugins/filid/src/core/rules/ruleEngine/evaluateRules.ts`
- `plugins/filid/src/core/rules/ruleEngine/utils/checkModuleEntryPoint.ts`
- `plugins/filid/src/core/rules/ruleEngine/utils/checkPureFunctionIsolation.ts`
- `plugins/filid/src/core/rules/ruleEngine/utils/checkZeroPeerFile.ts`
- `plugins/filid/src/core/rules/fractalValidator/validateDependencies.ts`
- `plugins/filid/src/core/rules/fractalValidator/validateStructure.ts`
- `plugins/filid/src/core/rules/fractalValidator/fractalValidator.ts`
- `plugins/filid/src/core/analysis/projectAnalyzer/analyzeProject.ts`
- `plugins/filid/src/core/analysis/projectAnalyzer/projectAnalyzer.ts`
- `plugins/filid/src/core/index.ts`
- `plugins/filid/src/index.ts`

삭제:

- `plugins/filid/src/core/rules/ruleEngine/utils/checkCircularDependency.ts`
- `plugins/filid/src/core/rules/ruleEngine/utils/checkIndexBarrelPattern.ts`
- `plugins/filid/src/core/rules/ruleEngine/utils/checkNamingConvention.ts`
- `plugins/filid/src/constants/allowedPeerFiles.ts`
- `plugins/filid/src/constants/frameworkRoutePatterns.ts`
- `plugins/filid/src/constants/namingPatterns.ts`

테스트:

- 수정
  `plugins/filid/src/__tests__/unit/core/dependencyGraph.test.ts`
- 수정
  `plugins/filid/src/__tests__/unit/core/ruleEngineRules.test.ts`
- 생성
  `plugins/filid/src/core/projectSnapshot/__tests__/projectSnapshot.spec.ts`
- 생성
  `plugins/filid/src/core/contextResolver/__tests__/contextResolver.spec.ts`
- 생성
  `plugins/filid/src/__tests__/unit/core/importBoundary.test.ts`

fail-first에서 실제 cycle, 형제 내부 import, 부모 barrel 우회, local barrel
self-import, unresolved dependency를 각각 재현한다. unresolved가 cycle 결론에
영향을 줄 때 `indeterminate`인지 확인한다.

```bash
yarn filid test:run src/core/projectSnapshot/__tests__/projectSnapshot.spec.ts src/core/contextResolver/__tests__/contextResolver.spec.ts
yarn filid test:run src/__tests__/unit/core/dependencyGraph.test.ts src/__tests__/unit/core/importBoundary.test.ts
yarn filid typecheck
```

모든 명령은 exit 0이어야 한다. snapshot spec은 content change에서 hash가
달라지고 mtime-only 변화에는 의미가 부여되지 않는 것을 보여야 한다.

### 작업 4 — multi-consumer LCA와 read-only restructure plan

생성:

- `plugins/filid/src/core/restructure/INTENT.md`
- `plugins/filid/src/core/restructure/DETAIL.md`
- `plugins/filid/src/core/restructure/index.ts`
- `plugins/filid/src/core/restructure/planner/createRestructurePlan.ts`
- `plugins/filid/src/core/restructure/planner/planMoveInstruction.ts`
- `plugins/filid/src/core/restructure/planner/resolveConsumerPaths.ts`
- `plugins/filid/src/core/restructure/planner/resolveContractIntent.ts`
- `plugins/filid/src/core/restructure/planner/resolveUnitKind.ts`
- `plugins/filid/src/core/restructure/planner/buildTargetCandidate.ts`
- `plugins/filid/src/core/restructure/planner/buildRequiredArtifacts.ts`
- `plugins/filid/src/core/restructure/imports/buildImportRewrites.ts`
- `plugins/filid/src/core/restructure/validator/validatePlanPreconditions.ts`
- `plugins/filid/src/core/restructure/validator/validatePlanPostconditions.ts`
- `plugins/filid/src/core/restructure/validator/snapshotContainsPath.ts`
- `plugins/filid/src/core/restructure/validator/resolveTargetNode.ts`
- `plugins/filid/src/core/restructure/validator/validateRequiredArtifacts.ts`
- `plugins/filid/src/core/restructure/validator/validateImportRewrites.ts`
- `plugins/filid/src/core/restructure/validator/validateMovePostconditions.ts`
- `plugins/filid/src/core/restructure/validator/validateBoundaryPostconditions.ts`
- `plugins/filid/src/core/restructure/validator/validateDependencyPostconditions.ts`
- `plugins/filid/src/core/analysis/lcaCalculator/findLowestCommonFractal.ts`
- `plugins/filid/src/core/analysis/lcaCalculator/resolveOwningFractal.ts`
- `plugins/filid/src/core/analysis/lcaCalculator/DETAIL.md`
- `plugins/filid/src/constants/analysisCertainties.ts`
- `plugins/filid/src/constants/nodeTypes.ts`
- `plugins/filid/src/constants/pathMarkers.ts`
- `plugins/filid/src/constants/restructure.ts`
- `plugins/filid/src/constants/ruleScopes.ts`
- `plugins/filid/src/types/restructure.ts`

수정:

- `plugins/filid/src/core/analysis/lcaCalculator/INTENT.md`
- `plugins/filid/src/core/analysis/lcaCalculator/lcaCalculator.ts`
- `plugins/filid/src/core/analysis/lcaCalculator/getAncestorPaths.ts`
- `plugins/filid/src/types/index.ts`

계약 스펙:

- 생성
  `plugins/filid/src/core/restructure/__tests__/restructurePlacement.spec.ts`
  — 15개 이하
- 생성
  `plugins/filid/src/core/restructure/__tests__/restructurePostconditions.test.ts`
  — 32개 이하
- 수정
  `plugins/filid/src/__tests__/unit/core/lcaCalculator.test.ts`

필수 사례:

- sibling 소비자 둘의 공유 파일 → 공통 부모 fractal의 organ
- 소비자 셋 → multi-consumer lowest common fractal
- 단일 소비자 → owner fractal의 organ
- 독립 공개 계약 → 새 fractal + 세 required artifact 역할
- 의미 organ 이름 불명 → unresolved/decision required
- plan 생성 중 project tree 무변경
- 실행 전 snapshot mismatch FAIL
- 잘못된 target, 남은 source, 누락 entry point, import boundary, cycle 각각
  postcondition FAIL

```bash
yarn filid test:run src/core/restructure/__tests__/restructurePlacement.spec.ts
yarn filid test:run src/core/restructure/__tests__/restructurePostconditions.test.ts
yarn filid typecheck
```

모든 명령은 exit 0이어야 하며 테스트 임시 project의 plan 전·후 file tree
비교에서 plan 생성 자체의 변경은 0개여야 한다.

Task 4의 고정 placement kind, artifact role, decision reason과 validation code는
`src/constants/restructure.ts`의 module-scope object enum/문자열 상수가
소유한다. 함수 내부에는 입력에서 계산된 동적 collection만 두며 같은 domain
값을 raw 문자열로 반복하지 않는다.

`planner/`, `imports/`, `validator/`는 leaf organ으로 유지한다. organ 아래
`helpers/`를 만들지 않고 분리 함수 파일을 해당 organ에 flat하게 둔다. Seiri의
helper 하위 배치 기본과 FCA organ leaf 규칙이 충돌할 때 저장소 FCA 규칙이
우선한다.

### 작업 5 — 공통 artifact envelope와 9개 MCP 도구

생성:

- `plugins/filid/src/core/infra/artifactStore/INTENT.md`
- `plugins/filid/src/core/infra/artifactStore/DETAIL.md`
- `plugins/filid/src/core/infra/artifactStore/index.ts`
- `plugins/filid/src/core/infra/artifactStore/artifactStore.ts`
- `plugins/filid/src/core/infra/artifactStore/operations/writeArtifactAtomic.ts`
- `plugins/filid/src/constants/toolEnvelope.ts`
- `plugins/filid/src/constants/mcpContracts.ts`
- `plugins/filid/src/constants/reviewState.ts`
- `plugins/filid/src/types/toolEnvelope.ts`
- `plugins/filid/src/mcp/tools/utils/createToolSnapshot.ts`
- `plugins/filid/src/mcp/tools/contextResolve/INTENT.md`
- `plugins/filid/src/mcp/tools/contextResolve/DETAIL.md`
- `plugins/filid/src/mcp/tools/contextResolve/index.ts`
- `plugins/filid/src/mcp/tools/contextResolve/contextResolve.ts`
- `plugins/filid/src/mcp/tools/restructurePlan/INTENT.md`
- `plugins/filid/src/mcp/tools/restructurePlan/DETAIL.md`
- `plugins/filid/src/mcp/tools/restructurePlan/index.ts`
- `plugins/filid/src/mcp/tools/restructurePlan/restructurePlan.ts`
- `plugins/filid/src/mcp/tools/verificationScan/INTENT.md`
- `plugins/filid/src/mcp/tools/verificationScan/DETAIL.md`
- `plugins/filid/src/mcp/tools/verificationScan/index.ts`
- `plugins/filid/src/mcp/tools/verificationScan/verificationScan.ts`
- `plugins/filid/src/mcp/tools/reviewState/INTENT.md`
- `plugins/filid/src/mcp/tools/reviewState/DETAIL.md`
- `plugins/filid/src/mcp/tools/reviewState/index.ts`
- `plugins/filid/src/mcp/tools/reviewState/reviewState.ts`
- `plugins/filid/src/mcp/tools/reviewState/handlers/prepareReviewState.ts`
- `plugins/filid/src/mcp/tools/reviewState/handlers/readReviewCheckpoint.ts`
- `plugins/filid/src/mcp/tools/reviewState/handlers/sealReviewState.ts`
- `plugins/filid/src/mcp/tools/reviewState/handlers/cleanupReviewState.ts`
- `plugins/filid/src/mcp/server/handlers/handleProjectInitTool.ts`
- `plugins/filid/src/mcp/server/handlers/handleRuleDocsSyncTool.ts`
- `plugins/filid/src/mcp/server/handlers/handleOpenSettingsTool.ts`
- `plugins/filid/src/mcp/tools/structureValidate/DETAIL.md`
- `plugins/filid/src/mcp/tools/ruleDocsSync/DETAIL.md`

수정:

- `plugins/filid/src/constants/mcpToolNames.ts`
- `plugins/filid/src/mcp/server/createServer.ts`
- `plugins/filid/src/mcp/server/toolResult.ts`
- `plugins/filid/src/mcp/server/toolError.ts`
- `plugins/filid/src/mcp/server/wrapHandler.ts`
- `plugins/filid/src/mcp/tools/index.ts`
- `plugins/filid/src/index.ts`
- `plugins/filid/src/core/index.ts`
- `plugins/filid/src/core/analysis/index.ts`
- `plugins/filid/src/core/analysis/lcaCalculator/lcaCalculator.ts`
- `plugins/filid/src/core/analysis/lcaCalculator/INTENT.md`
- `plugins/filid/src/core/analysis/lcaCalculator/DETAIL.md`
- `plugins/filid/src/core/infra/INTENT.md`
- `plugins/filid/src/mcp/tools/INTENT.md`
- `plugins/filid/src/mcp/tools/fractalScan/fractalScan.ts`
- `plugins/filid/src/mcp/tools/fractalScan/utils/buildScanResult.ts`
- `plugins/filid/src/mcp/tools/fractalScan/INTENT.md`
- `plugins/filid/src/mcp/tools/fractalScan/DETAIL.md`
- `plugins/filid/src/mcp/tools/structureValidate/INTENT.md`
- `plugins/filid/src/mcp/tools/structureValidate/structureValidate.ts`
- `plugins/filid/src/mcp/tools/projectInit/INTENT.md`
- `plugins/filid/src/mcp/tools/projectInit/DETAIL.md`
- `plugins/filid/src/mcp/tools/projectInit/projectInit.ts`
- `plugins/filid/src/mcp/tools/ruleDocsSync/INTENT.md`
- `plugins/filid/src/mcp/tools/ruleDocsSync/ruleDocsSync.ts`
- `plugins/filid/src/mcp/tools/openSettings/INTENT.md`
- `plugins/filid/src/mcp/tools/openSettings/DETAIL.md`
- `plugins/filid/src/mcp/tools/openSettings/openSettings.ts`
- `plugins/filid/src/types/report.ts`
- `plugins/filid/src/types/review.ts`
- `plugins/filid/src/types/index.ts`

Task 5에서는 아래 legacy 구현을 server registry, tool-name object enum과 public
barrel에서 제거해 관찰 가능한 MCP/core 표면을 닫는다. 구현 파일과 직접
characterization test의 물리 삭제는 import graph가 함께 사라지는 Task 8로
연기한다.

더 이상 consumer가 없는 `plugins/filid/src/mcp/server/serverHelpers.ts`
grab-bag facade는 Task 5에서 삭제하고 server assembly는 concrete helper를
직접 import한다.

테스트:

- 생성
  `plugins/filid/src/mcp/server/__tests__/toolEnvelope.spec.ts`
  — 15개 이하
- 생성
  `plugins/filid/src/__tests__/integration/vnextToolSurface.test.ts`
- 생성
  `plugins/filid/src/__tests__/unit/mcp/reviewStateLifecycle.test.ts`
- 생성
  `plugins/filid/src/__tests__/unit/mcp/reviewStateCache.test.ts`
- 생성
  `plugins/filid/src/__tests__/unit/mcp/reviewStateHash.test.ts`
- 수정
  `plugins/filid/src/__tests__/integration/reviewCache.test.ts`
- 수정
  `plugins/filid/src/__tests__/unit/mcp/fractalScan.test.ts`
- 수정
  `plugins/filid/src/__tests__/unit/mcp/toolResult.test.ts`
- 수정
  `plugins/filid/src/__tests__/unit/mcp/serverLifecycle.test.ts`

필수 결과:

- tool list가 정확히 9개다.
- 16 KiB 이하 data는 inline이다.
- 초과 data는 summary + 검증 가능한 절대 artifact path다.
- restructure plan은 작아도 artifact가 있다.
- artifact JSON의 SHA-256과 envelope가 일치한다.
- summary만 요청한 scan은 대형 tree를 inline하지 않는다.

```bash
yarn filid test:run src/mcp/server/__tests__/toolEnvelope.spec.ts
yarn filid test:run src/__tests__/integration/vnextToolSurface.test.ts
yarn filid typecheck
```

모든 명령은 exit 0이어야 하며 tool-surface fixture가 반환한 이름 배열은 이
문서의 9개 이름과 순서 무관 set-equality를 이뤄야 한다.

### 작업 6 — hook에서 criteria/spike/agent 역할 잔재 제거

수정:

- `plugins/filid/src/hooks/preToolUse/preToolUse.ts`
- `plugins/filid/src/hooks/preToolUse/helpers/preToolValidator/preToolValidator.ts`
- `plugins/filid/src/hooks/preToolUse/helpers/preToolValidator/INTENT.md`
- `plugins/filid/src/hooks/preToolUse/helpers/intentInjector/intentInjector.ts`
- `plugins/filid/src/hooks/preToolUse/helpers/intentInjector/INTENT.md`
- `plugins/filid/src/hooks/preToolUse/helpers/intentInjector/utils/resolveGateContext.ts`
- `plugins/filid/src/hooks/userPromptSubmit/userPromptSubmit.ts`
- `plugins/filid/src/hooks/userPromptSubmit/INTENT.md`
- `plugins/filid/src/hooks/INTENT.md`
- `plugins/filid/src/hooks/shared/shared.ts`
- `plugins/filid/src/hooks/shared/INTENT.md`
- `plugins/filid/src/core/infra/cacheManager/cacheManager.ts`
- `plugins/filid/src/core/infra/cacheManager/DETAIL.md`
- `plugins/filid/src/core/infra/cacheManager/INTENT.md`
- `plugins/filid/src/core/projectSnapshot/projectSnapshot.ts`
- `plugins/filid/src/core/projectSnapshot/DETAIL.md`
- `plugins/filid/src/core/projectSnapshot/INTENT.md`
- `plugins/filid/src/core/rules/ruleEngine/loadBuiltinRules.ts`
- `plugins/filid/src/core/rules/ruleEngine/DETAIL.md`
- `plugins/filid/src/core/rules/ruleEngine/INTENT.md`
- `plugins/filid/src/constants/builtinRuleIds.ts`
- `plugins/filid/src/constants/documentValidation.ts`
- `plugins/filid/src/types/documents.ts`
- `plugins/filid/src/types/hooks.ts`
- `plugins/filid/src/types/index.ts`
- `plugins/filid/src/types/fractal.ts`
- `plugins/filid/src/index.ts`
- `plugins/filid/src/hooks/index.ts`
- `plugins/filid/src/__tests__/bench/fixtures/generator.ts`
- `plugins/filid/scripts/buildHooks.mjs`
- `plugins/filid/hooks/hooks.json`
- `plugins/filid/templates/hooks/README.md`
- `plugins/filid/src/__tests__/bench/process/hookSpawn.bench.ts`

생성:

- `plugins/filid/src/core/projectSnapshot/evidence/collectLegacyCriteriaLedger.ts`
- `plugins/filid/src/core/rules/ruleEngine/utils/checkLegacyCriteriaLedger.ts`

삭제:

- `plugins/filid/src/hooks/agentEnforcer/`
- `plugins/filid/src/hooks/preToolUse/utils/auditDocDecision.ts`
- `plugins/filid/src/hooks/shared/utils/isCriteriaMd.ts`
- `plugins/filid/src/core/rules/documentValidator/validateCriteriaMd.ts`
- `plugins/filid/src/hooks/userPromptSubmit/utils/buildSpikeBanner.ts`
- `plugins/filid/src/hooks/utils/isSpikeBranch.ts`
- `plugins/filid/src/hooks/utils/readBranchReflog.ts`
- `plugins/filid/src/hooks/utils/readCurrentBranch.ts`
- `plugins/filid/src/hooks/utils/readHarvestManifest.ts`
- `plugins/filid/src/hooks/utils/readHeadSha.ts`
- `plugins/filid/src/constants/agentContext.ts`
- `plugins/filid/src/constants/spikeMode.ts`
- `plugins/filid/src/core/infra/cacheManager/caches/modeAuditCache.ts`

테스트:

- 수정
  `plugins/filid/src/__tests__/unit/core/documentValidator.test.ts`
- 수정
  `plugins/filid/src/__tests__/unit/hooks/preToolValidator.test.ts`
- 수정
  `plugins/filid/src/__tests__/unit/hooks/intentInjector.test.ts`
- 수정
  `plugins/filid/src/__tests__/unit/hooks/preToolUse.test.ts`
- 수정
  `plugins/filid/src/__tests__/unit/hooks/shared.test.ts`
- 수정
  `plugins/filid/src/hooks/userPromptSubmit/__tests__/userPromptSubmit.test.ts`
- 수정
  `plugins/filid/src/__tests__/integration/hookBundles.test.ts`
- 수정
  `plugins/filid/src/core/projectSnapshot/__tests__/projectSnapshot.spec.ts`
- 수정
  `plugins/filid/src/__tests__/unit/core/ruleEngineRules.test.ts`
- 삭제
  `plugins/filid/src/__tests__/unit/core/validateCriteriaMd.test.ts`
- 삭제
  `plugins/filid/src/__tests__/unit/hooks/agentEnforcer.test.ts`
- 삭제
  `plugins/filid/src/__tests__/unit/hooks/agentEnforcerGuidance.test.ts`
- 삭제
  `plugins/filid/src/hooks/userPromptSubmit/__tests__/buildSpikeBanner.test.ts`
- 삭제
  `plugins/filid/src/hooks/utils/__tests__/isSpikeBranch.test.ts`
- 삭제
  `plugins/filid/src/hooks/utils/__tests__/readBranchReflog.test.ts`
- 삭제
  `plugins/filid/src/hooks/utils/__tests__/readCurrentBranch.test.ts`
- 삭제
  `plugins/filid/src/hooks/utils/__tests__/readHarvestManifest.test.ts`
- 삭제
  `plugins/filid/src/hooks/utils/__tests__/readHeadSha.test.ts`
- 삭제
  `plugins/filid/src/__tests__/integration/spikeHarvestLoop.test.ts`
- 삭제
  `plugins/filid/src/__tests__/bench/hooks/agentEnforcer.bench.ts`

INTENT/DETAIL write gate는 유지한다. legacy criteria 발견은 hook deny가 아니라
`structure_validate` finding이다.

```bash
yarn filid test:run src/__tests__/unit/hooks/preToolUse.test.ts src/__tests__/unit/hooks/preToolValidator.test.ts
yarn filid test:run src/__tests__/integration/hookBundles.test.ts
yarn filid build:hooks
```

모든 명령은 exit 0이어야 한다. build output은 setup, user-prompt-submit,
pre-tool-use 세 hook과 shared host runner만 포함하고 agent-enforcer output을
포함하지 않아야 한다.

### 작업 7 — 스킬과 cross-review를 FCA 범위로 재작성

유지·수정:

- `plugins/filid/skills/setup/`
- `plugins/filid/skills/scan/`
- `plugins/filid/skills/context-query/`
- `plugins/filid/skills/guide/`
- `plugins/filid/skills/enrich-docs/`
- `plugins/filid/skills/restructure/`
- `plugins/filid/skills/cross-review/`
- `plugins/filid/skills/migrate/`

cross-review에서 생성:

- `plugins/filid/skills/cross-review/reviewers/contract.md`
- `plugins/filid/skills/cross-review/reviewers/structure.md`
- `plugins/filid/skills/cross-review/reviewers/verification.md`
- `plugins/filid/skills/cross-review/reviewers/adversarial.md`
- `plugins/filid/skills/cross-review/calibration/contract-change.md`

cross-review에서 삭제:

- `plugins/filid/skills/cross-review/calibration/claim-change.md`

제거:

- `plugins/filid/skills/.DS_Store`
- `plugins/filid/skills/ast-fallback/`
- `plugins/filid/skills/config-wizard/`
- `plugins/filid/skills/harvest/`
- `plugins/filid/skills/pipeline/`
- `plugins/filid/skills/promote/`
- `plugins/filid/skills/pull-request/`
- `plugins/filid/skills/resolve/`
- `plugins/filid/skills/revalidate/`
- `plugins/filid/skills/structure-review/`
- `plugins/filid/skills/sync/`
- `plugins/filid/skills/update/`
- `plugins/filid/agents/`

함께 삭제:

- `plugins/filid/src/__tests__/integration/reviewPipeline.test.ts`
- `plugins/filid/src/__tests__/integration/syncPipeline.test.ts`

`cross-review/SKILL.md`, `contracts.md`, `spec.md`, `templates.md`,
`phases/evidence.md`, `reference.md`는 세 관점과 adversarial 판정 계약으로
전면 재작성한다. calibration의 clean/low/seeded fixture는 유지하되 FCA
finding만 포함하도록 갱신한다.

검증:

```bash
yarn plugin:adapters
rg -n "ast_analyze|ast_grep|test_metrics|fractal_navigate|rule_query|drift_detect|lca_resolve|config_patch_validate|coverage_verify|debt_manage|cache_manage|review_manage|code-surgeon|criteria\\.md|3\\+12|LCOM4|cyclomatic" plugins/filid/skills
find plugins/filid/skills -mindepth 1 -maxdepth 1 -type d | wc -l
```

첫 명령 후 생성 adapter가 8개 스킬만 포함해야 한다. 두 번째 명령의 남은
매치는 0이어야 하며 세 번째 명령은 8이어야 한다.

### 작업 8 — stale source와 npm library 표면 제거

삭제:

- `plugins/filid/src/ast/`
- `plugins/filid/src/compress/`
- `plugins/filid/src/mcp/tools/astAnalyze/`
- `plugins/filid/src/mcp/tools/astGrepReplace/`
- `plugins/filid/src/mcp/tools/astGrepSearch/`
- `plugins/filid/src/mcp/tools/cacheManage/`
- `plugins/filid/src/mcp/tools/configPatchValidate/`
- `plugins/filid/src/mcp/tools/coverageVerify/`
- `plugins/filid/src/mcp/tools/debtManage/`
- `plugins/filid/src/mcp/tools/docCompress/`
- `plugins/filid/src/mcp/tools/driftDetect/`
- `plugins/filid/src/mcp/tools/fractalNavigate/`
- `plugins/filid/src/mcp/tools/lcaResolve/`
- `plugins/filid/src/mcp/tools/reviewManage/`
- `plugins/filid/src/mcp/tools/ruleQuery/`
- `plugins/filid/src/mcp/tools/testMetrics/`
- `plugins/filid/src/core/coverageVerify/`
- `plugins/filid/src/core/analysis/projectAnalyzer/`
- `plugins/filid/src/core/analysis/lcaCalculator/findLca.ts`
- `plugins/filid/src/core/analysis/lcaCalculator/getModulePlacement.ts`
- `plugins/filid/src/core/rules/driftDetector/`
- `plugins/filid/src/core/module/`
- `plugins/filid/src/core/prSummary/`
- `plugins/filid/src/core/infra/changeQueue/`
- `plugins/filid/src/core/infra/projectHash/`
- `plugins/filid/src/hooks/changeTracker/`
- `plugins/filid/src/metrics/`
- `plugins/filid/src/types/ast.ts`
- `plugins/filid/src/types/coverage.ts`
- `plugins/filid/src/types/debt.ts`
- `plugins/filid/src/types/drift.ts`
- `plugins/filid/src/types/handoff.ts`
- `plugins/filid/src/types/metrics.ts`
- `plugins/filid/src/types/review.ts`
- `plugins/filid/src/types/summary.ts`
- `plugins/filid/src/constants/astLanguages.ts`
- `plugins/filid/src/constants/debtDefaults.ts`
- `plugins/filid/src/constants/decisionPoints.ts`
- `plugins/filid/src/constants/driftMappings.ts`
- `plugins/filid/src/constants/entryCandidates.ts`
- `plugins/filid/src/constants/handoffTokens.ts`
- `plugins/filid/src/constants/healthScore.ts`
- `plugins/filid/src/constants/qualityThresholds.ts`
- `plugins/filid/src/constants/reviewProbabilities.ts`
- `plugins/filid/src/constants/reviewDefaults.ts`
- `plugins/filid/src/lib/normalizeFixRequest.ts`
- `plugins/filid/src/__tests__/unit/types/handoff.test.ts`
- `plugins/filid/src/index.ts`
- `plugins/filid/tsconfig.build.json`

제거되는 구현의 테스트도 함께 삭제:

- `plugins/filid/src/__tests__/unit/ast/cyclomaticComplexity.test.ts`
- `plugins/filid/src/__tests__/unit/ast/dependencyExtractor.test.ts`
- `plugins/filid/src/__tests__/unit/ast/lcom4.test.ts`
- `plugins/filid/src/__tests__/unit/ast/parser.test.ts`
- `plugins/filid/src/__tests__/unit/ast/treeDiff.test.ts`
- `plugins/filid/src/__tests__/unit/compress/lossySummarizer.test.ts`
- `plugins/filid/src/__tests__/unit/compress/reversibleCompactor.test.ts`
- `plugins/filid/src/__tests__/unit/core/analyzeProjectConfig.test.ts`
- `plugins/filid/src/__tests__/unit/core/changeQueue.test.ts`
- `plugins/filid/src/__tests__/unit/core/driftDetector.test.ts`
- `plugins/filid/src/__tests__/unit/core/driftDetectorSync.test.ts`
- `plugins/filid/src/__tests__/unit/core/extractVerdict.test.ts`
- `plugins/filid/src/__tests__/unit/core/findCentralizedTest.test.ts`
- `plugins/filid/src/__tests__/unit/core/findNestedModuleTest.test.ts`
- `plugins/filid/src/__tests__/unit/core/importResolver.test.ts`
- `plugins/filid/src/__tests__/unit/core/indexAnalyzer.test.ts`
- `plugins/filid/src/__tests__/unit/core/moduleMainAnalyzer.test.ts`
- `plugins/filid/src/__tests__/unit/core/prSummaryGenerator.test.ts`
- `plugins/filid/src/__tests__/unit/core/prSummaryParser.test.ts`
- `plugins/filid/src/__tests__/unit/core/projectAnalyzer.test.ts`
- `plugins/filid/src/__tests__/unit/core/testCoverageChecker.test.ts`
- `plugins/filid/src/__tests__/unit/core/usageTracker.test.ts`
- `plugins/filid/src/__tests__/unit/hooks/changeTracker.test.ts`
- `plugins/filid/src/__tests__/unit/mcp/astAnalyze.test.ts`
- `plugins/filid/src/__tests__/unit/mcp/astGrepReplace.test.ts`
- `plugins/filid/src/__tests__/unit/mcp/astGrepSearch.test.ts`
- `plugins/filid/src/__tests__/unit/mcp/astGrepShared.test.ts`
- `plugins/filid/src/__tests__/unit/mcp/astGrepSharedFiles.test.ts`
- `plugins/filid/src/__tests__/unit/mcp/astGrepSharedFormat.test.ts`
- `plugins/filid/src/__tests__/unit/mcp/cacheManage.test.ts`
- `plugins/filid/src/__tests__/unit/mcp/configPatchValidate.test.ts`
- `plugins/filid/src/__tests__/unit/mcp/coverageVerify.test.ts`
- `plugins/filid/src/__tests__/unit/mcp/debtManage.test.ts`
- `plugins/filid/src/__tests__/unit/mcp/docCompress.test.ts`
- `plugins/filid/src/__tests__/unit/mcp/fractalNavigate.test.ts`
- `plugins/filid/src/__tests__/unit/mcp/configWarningsPropagation.test.ts`
- `plugins/filid/src/__tests__/unit/mcp/reviewFormat.test.ts`
- `plugins/filid/src/__tests__/unit/mcp/reviewManage.test.ts`
- `plugins/filid/src/__tests__/unit/mcp/reviewManageSummary.test.ts`
- `plugins/filid/src/__tests__/unit/mcp/testMetrics.test.ts`
- `plugins/filid/src/__tests__/unit/metrics/decisionTree.test.ts`
- `plugins/filid/src/__tests__/unit/metrics/promotionTracker.test.ts`
- `plugins/filid/src/__tests__/unit/metrics/testCaseGate.test.ts`
- `plugins/filid/src/__tests__/unit/metrics/testCounter.test.ts`
- `plugins/filid/src/__tests__/bench/hooks/changeTracker.bench.ts`

수정:

- `plugins/filid/package.json`
- `plugins/filid/DETAIL.md`
- `plugins/filid/CLAUDE.md`
- `plugins/filid/src/adapters/INTENT.md`
- `plugins/filid/src/adapters/ecmascript/INTENT.md`
- `plugins/filid/src/core/tree/fractalTree/DETAIL.md`
- `plugins/filid/scripts/buildMcpServer.mjs`
- `plugins/filid/src/core/index.ts`
- `plugins/filid/src/core/infra/index.ts`
- `plugins/filid/src/core/infra/INTENT.md`
- `plugins/filid/src/core/rules/ruleEngine/utils/isExempt.ts`
- `plugins/filid/src/types/report.ts`
- `plugins/filid/src/types/index.ts`
- `plugins/filid/src/mcp/tools/index.ts`
- `plugins/filid/src/__tests__/unit/core/lcaCalculator.test.ts`
- `plugins/filid/src/__tests__/unit/core/cacheManager.test.ts`
- `plugins/filid/src/__tests__/unit/core/isExempt.test.ts`
- `plugins/filid/src/__tests__/bench/fixtures/generator.ts`
- `plugins/filid/src/__tests__/bench/scaling/complexityScaling.bench.ts`
- `plugins/filid/scripts/buildHooks.mjs`
- `yarn.lock`

package 결정:

- `private: true`를 추가한다.
- `exports`, `main`, `types`와 `files`의 `dist`를 제거한다.
- `build:compile`과 build pipeline의 해당 단계를 제거한다.
- `@ast-grep/napi`와 `fast-glob` dependency를 제거한다.
- MCP build의 global `NODE_PATH` banner와 native external 설정을 제거한다.
- `src/index.ts`라는 npm library barrel을 없애고 MCP/hook entry만 build한다.
- `yarn filid version:major`로 0.8.x에서 1.0.0으로 올리고
  `yarn filid version:sync`로 source version을 동기화한다.

characterization:

- 어댑터 도입 전 directory scan 결과를 fixture로 고정하고, fast-glob 제거
  전·후 node path 집합이 동일한지 확인한다.
- plugin entry와 hook entry build가 npm barrel 없이 성공하는지 확인한다.

검증:

```bash
rg -n "@ast-grep/napi|fast-glob|npm root -g|NODE_PATH" plugins/filid yarn.lock
yarn filid typecheck
yarn filid test:run
yarn filid build
```

첫 명령은 Filid package/source/build script에서 매치 0이어야 한다. lockfile의
다른 workspace가 같은 패키지를 실제로 쓰면 Filid dependency edge가 없음을
`yarn why`로 확인하고 그 사유를 변경 기록에 남긴다. 나머지는 exit 0이어야 한다.

### 작업 9 — 생성물과 사용자 문서를 실제 1.0 상태로 동기화

구현 완료 후에만 수정:

- `plugins/filid/README.md`
- `plugins/filid/README-ko_kr.md`
- `.metadata/filid/01-ARCHITECTURE.md`
- `.metadata/filid/02-BLUEPRINT.md`
- `.metadata/filid/03-LIFECYCLE.md`
- `.metadata/filid/04-USAGE.md`
- `.metadata/filid/05-COST-ANALYSIS.md`
- `.metadata/filid/06-HOW-IT-WORKS.md`
- `.metadata/filid/07-RULES-REFERENCE.md`
- `.metadata/filid/08-API-SURFACE.md`

생성 명령으로만 갱신:

- `plugins/filid/templates/rules/manifest.json`
- `plugins/filid/bridge/`
- `plugins/filid/public/`
- `plugins/filid/.codex-plugin/`
- `plugins/filid/.claude-plugin/plugin.json`
- `plugins/filid/plugin.json`
- `plugins/filid/mcp_config.json`
- `plugins/filid/hooks.json`

명령:

```bash
yarn filid build
yarn plugin:adapters:check
yarn filid test:e2e
git status --short
```

기대 결과:

- build와 adapter check, e2e가 exit 0이다.
- 생성물 diff에 9개 MCP 도구, 8개 스킬, agent-enforcer 부재가 반영된다.
- `git status --short`에는 의도한 Filid와 `.metadata/filid` 변경만 보인다.

### 작업 10 — 전역 상수·함수 경계·FCA 적합성과 독립 검증

작업 0–9 완료 후 `plugins/filid`의 canonical source와 문서를 전체 감사한다.
생성물은 source 변경 후 공식 build 결과만 검토하며 직접 고치지 않는다.

- 반복되는 domain/protocol/status/role/path/config 문자열은
  `src/constants`의 object enum 또는 문자열 상수가 소유한다. 자연어 진단,
  단일 테스트 fixture content처럼 중앙 관리 대상이 아닌 문자열은 제외한다.
- 정적 상수 객체·배열은 module scope에 둔다. 입력에서 계산되는 collection만
  함수 context에 둔다.
- 새로 쓰거나 이동한 함수는 한 파일 한 exported function과 graspable
  orchestration을 지킨다. organ은 flat leaf라는 FCA 규칙이 helper 하위 배치
  기본보다 우선한다.
- 각 fractal의 문서, named entry point, 외부 import 경계와 touched dependency
  DAG를 검사하고 새 finding을 0으로 만든다. 전체 Filid 구조검사는 컨텍스트
  비용을 줄이기 위해 모든 개발·리팩터링이 끝난 뒤 이 작업에서 한 번 수행한다.
- 최소 두 개의 독립 review context가 전체 plugin diff와 AC-01~AC-20 증거를
  각각 검토한다. 지적은 `/seiri:receive-review`로 실제 코드에서 재검증한 뒤
  수용하거나 근거와 함께 기각한다.
- full test/build/e2e와 아래 최종 검증을 통과한 후 review seam별로 커밋한다.
  push와 PR 생성은 하지 않는다.

### 작업 11 — merge-track 5스킬을 9개 도구 위로 재작성 (2026-07-28 추가)

작업 7이 제거한 `pull-request`, `resolve`, `revalidate`, `pipeline`을 되살린다.
`git checkout`으로 복원하지 않는다 — 넷 모두 제거된 도구에 의존하므로 재작성한다.

생성:

- `plugins/filid/skills/pull-request/{SKILL.md,reference.md}`
- `plugins/filid/skills/resolve/{SKILL.md,reference.md}`
- `plugins/filid/skills/revalidate/{SKILL.md,reference.md,spec.md}`
- `plugins/filid/skills/pipeline/{SKILL.md,reference.md}`

도구 매핑(제거된 것 → 대체):

| 제거된 참조                       | 대체                                                     |
| --------------------------------- | -------------------------------------------------------- |
| `review_manage(normalize-branch)` | `review_state(prepare\|checkpoint)`의 `normalizedBranch` |
| `review_manage(checkpoint)`       | `review_state(checkpoint)`                               |
| `review_manage(cleanup)`          | `review_state(cleanup, confirm: true)`                   |
| `review_manage(elect-committee)`  | 제거 — 1.0의 관점은 고정 3개다                           |
| `ast_analyze`, `test_metrics`     | `verification_scan`, `structure_validate`                |
| `config_patch_validate`           | `open_settings` 내부 검증                                |
| `filid:code-surgeon` 에이전트     | 메인 에이전트 또는 다른 플러그인에 위임                  |

계약:

- `resolve`는 코드를 직접 수정하지 않는다. 각 fix 항목의 수용/거부를 받고,
  수용 항목은 **적용 지시와 대상 경로를 외부 실행자에게 넘긴다.** 적용 여부
  확인은 `revalidate`의 재측정이 담당한다.
- 네 스킬 모두 제거된 스킬(`update`, `harvest`, `promote`, `structure-review`)을
  참조하지 않는다.
- 각 단계의 산출 형식은 계약이다. `.filid/review/<branch>/` 아래 파일명과
  frontmatter는 다음 단계의 입력 스키마다.

검증:

```bash
find plugins/filid/skills -mindepth 1 -maxdepth 1 -type d | wc -l   # 12
rg -n "review_manage|debt_manage|ast_analyze|test_metrics|config_patch_validate|coverage_verify|drift_detect|lca_resolve|rule_query|doc_compress|fractal_navigate|cache_manage|code-surgeon|filid:update|filid:harvest|filid:promote|filid:structure-review" plugins/filid/skills
yarn plugin:adapters
```

두 번째 명령의 매치는 0이어야 하고, 세 번째 명령 후 생성 adapter가 12개 스킬을
포함해야 한다.

**결정됨 (2026-07-28, 소유자):**

1. **거부 기록은 `.filid/review/<branch>/justifications.md`에만 남긴다.**
   커밋되는 부채 원장(`.filid/debt/`)은 되살리지 않는다. `revalidate`는 이
   파일의 거부 항목을 재판정 입력으로 읽는다. 필요한 것은 절차와 기록이며,
   별도 debt workflow는 여전히 Filid 소유가 아니다.

2. **`pull-request` Stage 1은 `enrich-docs`가 담당한다.** 문서 최신화의 최종
   책임은 PR 시점에 있다는 것이 저장소 정책이므로, Stage 1을 검사-보고로
   약화시키지 않는다.

   `update`를 제거한 이유는 "문서를 PR 시점에 갱신하는 것"이 아니라 "승인
   지점 없이 자동 재작성하는 것"이었다. `enrich-docs`는 같은 일을 승인 게이트와
   사후 구조 검증을 붙여 수행하며, 그 `When to Use`가 이미 drift를 포함한다 —
   "INTENT.md ... no longer describes its module", "DETAIL.md does not express
   the current public contract". 따라서 대체가 아니라 **정상 계승**이다.

   구현 계약:
   - Stage 1은 branch diff에서 변경된 프랙탈 경로를 도출해 `enrich-docs`의
     target으로 넘긴다. 전체 트리를 감사하지 않는다 — PR 범위와 문서 감사
     범위를 일치시킨다.
   - `pipeline --auto` 경로에서는 `--auto-approve`로 호출하고, 단독 실행에서는
     `enrich-docs`의 승인 절차를 그대로 통과시킨다.
   - Stage 1 이후 `INTENT.md`/`DETAIL.md` 경로만 stage하고
     `docs(filid): sync INTENT.md / DETAIL.md via enrich-docs`로 커밋한다.
     그 밖의 파일이 dirty면 Stage 0에서 중단한다 — 기존 계약과 동일하다.
   - `--skip-enrich` 플래그로 이 단계를 건너뛸 수 있다(구 `--skip-update`).

**문서 갱신 책임의 현재 소유자 (참고):**

| 작업                           | 소유 스킬                              |
| ------------------------------ | -------------------------------------- |
| 문서 위반·drift **탐지**       | `scan` (전체), `cross-review` (변경분) |
| 문서 **갱신** (승인 후 편집)   | `enrich-docs`                          |
| 누락 문서 **제안** (초기화 시) | `setup`                                |
| PR 시점 **강제**               | `pull-request` Stage 1 → `enrich-docs` |
| legacy 문서명 이관             | `migrate`                              |

### 작업 12 — 분류와 organ 경계 개정을 코드에 반영 (2026-07-28 추가)

자기 자신에 대한 첫 전체 구조검사가 832건을 냈고, 그중 711건(`external-import-boundary` 708 + cycle 3)이 하나의 뿌리에서 나왔다. 「노드」 절과 「프로젝트 snapshot과 DAG」 절의 개정을 코드에 반영한다.

**완료된 부분 (2026-07-28)**

- `templates/rules/filid_fca-policy.md` — 분류 6단계, "분류는 서술이지 규범이 아니다" 원칙, organ 접근 표, 면책 계약을 반영했다. `build:rules`로 manifest hash를 갱신하고 `rule_docs_sync`로 `.claude/rules/`에 재배포해 `inSync: true`를 확인했다.

  배포 드리프트가 실재했다. 작업 0이 canonical 원본만 고치고 재배포하지 않아 `.claude/rules/filid_fca-policy.md`가 158줄 v0.8.x 그대로였다 — 이 저장소에서 일하는 에이전트들이 세션 내내 stale 규칙(`index-barrel-pattern`, LCOM4, 3+12)을 읽고 있었다. **canonical rule 문서를 고치면 `build:rules` + `rule_docs_sync`까지가 한 단위다.**

**남은 수정 대상**

- `src/core/tree/organClassifier/` — 우선순위 사다리를 6단계로 축소. 기본값을 `fractal`에서 `organ`으로 뒤집고, 분류 입력을 `kind: "module"` entry point로 한정한다.
- `src/adapters/ecmascript/structure/findEntryPoints.ts` — module index와 config override로 주입된 경로를 서로 다른 `kind`로 보고한다.
- `src/core/rules/ruleEngine/utils/checkExternalImportBoundary.ts` — 대상이 organ이면 소비자 위치로 판정한다. 현재 이 함수에는 **면책 경로가 아예 없다** — `isExempt` 호출이 없어 config의 `exempt`가 이 규칙에서 무시된다.
- `src/core/analysis/dependencyGraph/` — 소유 subtree 안의 organ 참조를 부모 fractal edge로 승격하지 않는다. cycle 오판의 원인이다.
- `src/core/rules/documentValidator/` — DETAIL.md의 조건부 `## Organ Exemptions` 섹션을 파싱한다. acceptance group과 같은 `### <organ path> — <title>` 형태이므로 기존 파서를 재사용한다. **없는 것이 정상이며 면책을 선언할 때만 존재한다.** `Reason`이 비면 면책이 아니라 미충족 계약이다.
- `.filid/config.json` — `structure.entryPointOverrides.ecmascript`에서 `SKILL.md`를 제거한다.

**검증**

- 재스캔에서 `external-import-boundary`가 소유 subtree 안의 organ 참조를 내지 않는다.
- `src/hooks -> src/hooks/preToolUse -> src/hooks` cycle이 사라진다.
- `skills/setup`과 `skills/cross-review`가 organ으로 분류되고 INTENT/DETAIL·entry-point·zero-peer finding을 내지 않는다.
- 소유 subtree **밖**에서 organ을 직접 참조하는 fixture는 여전히 위반으로 잡히고, DETAIL에 면책을 선언하면 통과한다. 규칙이 느슨해진 것이 아니라 대상이 바뀐 것임을 보이는 fail-first가 양쪽 다 필요하다.
- 훅 경로가 면책 선언으로 통과하고, 선언을 지우면 다시 위반이 된다.

## Acceptance Criteria

| ID    | 검증할 결과                                                                                                         |
| ----- | ------------------------------------------------------------------------------------------------------------------- |
| AC-01 | spec-document 15 cases는 PASS, 16은 violation                                                                       |
| AC-02 | test-record 32 cases는 PASS, 33은 violation                                                                         |
| AC-03 | 여러 test-record의 총 case 수에는 제한이 없음                                                                       |
| AC-04 | 정적 parameterized 16 rows는 16으로 계산되어 violation                                                              |
| AC-05 | dynamic/unsupported count는 PASS가 아닌 `indeterminate`/`unsupported`                                               |
| AC-06 | 서로 다른 DETAIL acceptance group의 여러 spec은 PASS                                                                |
| AC-07 | 같은 group을 나눈 여러 spec은 `spec-fragmentation`                                                                  |
| AC-08 | sibling 소비자의 공유 단위는 lowest common fractal의 organ으로 계획                                                 |
| AC-09 | 독립 공개 계약 단위는 fractal과 필수 artifact로 계획                                                                |
| AC-10 | `restructure_plan`은 프로젝트 tree를 변경하지 않음                                                                  |
| AC-11 | stale snapshot은 plan precondition FAIL                                                                             |
| AC-12 | 잘못된 target/entry/import/DAG는 postcondition FAIL                                                                 |
| AC-13 | 대형 결과는 작은 inline summary와 검증 가능한 artifact path 반환                                                    |
| AC-14 | 새 verification 생태계는 core/policy/MCP DTO 수정 없이 adapter 등록                                                 |
| AC-15 | Filid는 Seiri가 설치되지 않아도 모든 자체 기능 수행                                                                 |
| AC-16 | `@ast-grep/napi`, global npm 탐색과 `fast-glob` 없이 build                                                          |
| AC-17 | DAG rule이 실제 cycle을 검출하며 placeholder PASS가 없음                                                            |
| AC-18 | cross-review finding은 FCA 증거만 인용하고 구조 수정은 exact plan을 사용                                            |
| AC-19 | 목표 MCP tool은 정확히 9개, 사용자 skill은 정확히 12개                                                              |
| AC-20 | core/policy/DTO에는 초기 생태계의 확장자·테스트 호출 리터럴이 없음                                                  |
| AC-21 | merge-track 5스킬이 9개 도구 표면만으로 동작하며 제거된 도구를 참조하지 않음                                        |
| AC-22 | `resolve`는 코드를 직접 수정하지 않고 적용을 외부에 위임하며, 수용/거부 결정과 사유는 기록됨                        |
| AC-23 | `pipeline --auto`가 pr-create → review → resolve → revalidate를 중단 없이 연결                                      |
| AC-24 | `config-wizard` 없이 `project_init` + `open_settings`만으로 config v2 생성·조회·저장이 완결됨                       |
| AC-25 | 문서도 module index도 없는 디렉터리는 `organ`으로 분류되고, `SKILL.md` 같은 override 경로는 분류를 바꾸지 못함      |
| AC-26 | 소유 subtree 안의 organ 직접 참조는 통과, 밖에서의 직접 참조는 위반, DETAIL의 `Organ Exemptions` 선언이 있으면 통과 |
| AC-27 | 자식 fractal이 부모 소유 organ을 참조해도 cycle로 판정되지 않음                                                     |

## 최종 검증 순서

후속 구현 세션의 마지막에는 `/seiri:verify`를 로드한 뒤 아래 순서대로 실행한다.

```bash
yarn filid typecheck
yarn filid test:run
yarn filid build
yarn plugin:adapters:check
yarn filid test:e2e
rg -n "@ast-grep/napi|fast-glob|ast_analyze|ast_grep_search|ast_grep_replace|test_metrics|3\\+12|DEFAULT_STABILITY_DAYS|LCOM4_SPLIT_THRESHOLD|CC_THRESHOLD" plugins/filid --glob '!bridge/**' --glob '!public/**'
git diff --check
git status --short
```

- 처음 다섯 명령과 `git diff --check`는 exit 0이어야 한다.
- `rg`는 migration/history라고 명시된 `.metadata`가 아니라
  `plugins/filid`의 live source, skill, rule에서 매치 0이어야 한다.
- build 후 생성물의 diff를 검토하고, 손편집 흔적이 없어야 한다.
- 실패하면 완료를 주장하지 않고 `/seiri:trace-cause`로 원인을 추적한다.

## 실행 인계

후속 개발은 이 파일을 입력으로 `/seiri:execute`를 시작한다. 한 번에 전체를
재작성하지 않고 작업 0부터 순서대로 진행한다. 각 작업은 자체 fail-first 또는
characterization 증거, scoped test, 문서 선행 변경을 갖춘 별도 review seam으로
끝낸다.
