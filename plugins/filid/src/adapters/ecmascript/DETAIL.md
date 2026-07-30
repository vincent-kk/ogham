# ecmascript adapter — Contract

## Requirements

- adapter는 현재 생태계 source file과 package/framework evidence를 탐지한다.
- source discovery는 git이 무시하고 추적하지도 않는 파일을 제외한다. 이 결과가 dependency와 verification evidence의 입력이므로, 무시되는 build 산출물이 discovery에 남으면 DAG와 verification 계약이 산출물을 대상으로 판정한다. git이 없거나 project root가 work tree 밖이면 제외 없이 전부 탐지한다.
- module, executable, framework과 manifest entry point를 exact path와 adapter ID로 보고한다.
- 디렉터리에 `package.json`이 있으면 그것을 `kind: 'manifest'` entry point로 보고한다. 이 생태계에서 패키지의 공개 표면을 선언하는 자리는 `exports`·`main`·`bin`이고, 배럴이 없는 패키지 루트도 그 선언으로 소비자를 받는다 — 진입점이 없는 것이 아니라 module 파일이 아닌 곳에 있는 것이다. 상위 디렉터리의 `package.json`은 대상이 아니다(그건 framework 탐지용 조회다).
- manifest는 `kind: 'module'`이 아니다. module은 분류기가 읽는 유일한 kind이므로, manifest가 module이면 `package.json`을 가진 모든 디렉터리가 fractal이 된다 — 저장소 루트까지 포함해서다. `surface`는 선언을 열거할 수 있으므로 `enumerated`이고, `framework`의 `opaque`를 쓰면 패키지 루트마다 영구 `entry-point-surface` 경고가 생긴다.
- manifest entry의 inspection은 lexical scan이 아니라 JSON 파싱이다. `exports` 키 집합이 named surface이며, `exports`가 없으면 `main`·`bin`이 선언한 단일 진입을 `.` 하나로 보고한다.
- 파싱은 되었으나 세 필드가 모두 없는 매니페스트는 **표면이 빈 `exact`**다. 스펙시파이어로 가져올 것이 없다는 것은 확정된 사실이며, 그것을 `indeterminate`로 보고하면 아무것도 노출하지 않기로 한 private 패키지마다 영구 `entry-point-surface` 경고가 생긴다. `indeterminate`는 파싱이 실패해 선언을 읽지 못한 경우로 한정한다 — "노출하지 않는다"와 "읽을 수 없다"는 다른 사실이다.
- config가 이 adapter에 전달한 exact peer filename은 declared entry override로 해석하며 **`kind: 'module'`로 보고하지 않는다.** module은 adapter가 스스로 알아본 module index에만 쓰는 kind이고, 분류기는 그 kind 하나만 읽는다. override가 module이면 config 한 줄이 디렉터리를 fractal로 바꿔버린다.
- override는 `kind: 'executable'`, `surface: 'enumerated'`로 보고한다. `framework`는 surface를 `opaque`로 끌어내려 정당한 override마다 영구적인 `entry-point-surface` 경고를 만든다 — override는 그 규칙의 입력이지 위반 원인이 아니다.
- entry point의 named exports, direct declarations와 certainty를 lexical scan으로 판정한다.
- static/dynamic import와 re-export 중 project-internal dependency를 추출하고 local specifier를 정규화한다.
- package-level external dependency는 project DAG 후보에서 제외하고, 해석할 수 없는 local dependency는 `resolvedPath: null`로 보존한다.
- strings, comments와 template text 안의 가짜 syntax를 dependency나 export로 세지 않는다.
- `import.meta`는 dependency가 아니다. `import` 뒤에 `.`이 오면 메타 속성 참조이므로 뒤따르는 문자열을 specifier로 읽지 않는다. 이를 구분하지 않으면 `join(dirname(fileURLToPath(import.meta.url)), '../..')` 같은 경로 계산이 해석 불가 dependency로 잡혀 그래프 전체가 `indeterminate`가 된다.
- 지원 불가능한 alias·동적 표현은 unsupported/indeterminate evidence를 남긴다.
- verification 동작은 작업 2의 15/32와 contract-marker 계약을 구현한다.
- verification role은 **파일명 접미사가 후보를 고르고 파일 내용이 확정한다.** `.spec`/`.test` stem은 후보일 뿐이며, 인식 가능한 case/suite 호출이 하나도 없는 파일은 `unsupported`다. 접미사만으로 역할을 주면 프로덕션 파일을 `x.spec.ts`로 개명하는 것만으로 boundary와 DAG 면제를 얻는다 — 개명은 증거가 아니다.

## API Contracts

- `ecmascriptStructureAdapter: StructureAdapter` — registry에 등록되는 초기 structure adapter.
- `scanLexicalTokens(source)` — comment/string/template와 delimiter nesting을 보존한 lexical token stream.
- `extractDependencyReferences(filePath)` — adapter 중립 `DependencyReference[]`.
- `findEntryPoints(directoryPath, overrides?)` — module/executable/framework/manifest/configured descriptor 배열.
- `ecmascriptVerificationAdapter` — spec/test role, semantic case count와 contract group marker를 분석하는 초기 verification adapter.
- `countSemanticCases(source)` — 일반/skip/todo/property와 정적 parameterized rows를 의미론적 case 수로 계산하고 동적 구조를 indeterminate로 반환.
- `extractContractGroupIds(source)` — comment의 `filid:contract` marker 추출.
- `ECMASCRIPT_ADAPTER_ID` — config와 evidence가 공유하는 안정 adapter ID.

## Acceptance Criteria

### AC-ecmascript-detection — 생태계 claim

- package 또는 지원 source evidence가 있으면 양수 confidence를 반환한다.
- 알 수 없는 파일만 있는 project는 ownership을 주장하지 않는다.
- git이 무시하는 source file은 `discoverSourceFiles()` 결과에 없고, ignore pattern에 걸려도 추적되는 파일은 남는다. git이 없으면 전부 남는다.

### AC-ecmascript-structure — entry와 dependency

- module·executable·framework·manifest entry point를 구분하고 named surface를 검사한다.
- `package.json`을 가진 디렉터리는 `kind: 'manifest'` descriptor를 얻고, 그 kind는 분류를 유발하지 않는다 — `package.json`만 있는 디렉터리는 organ으로 남는다.
- manifest inspection은 `exports` 키를 named surface로 반환하고, `exports` 없이 `main`만 있으면 `.` 하나를 반환한다.
- 선언이 하나도 없는 매니페스트는 빈 표면의 `exact`이고, 파싱 실패만 `indeterminate`다.
- 다른 adapter ID의 override와 섞지 않고 전달된 exact filename만 인식한다.
- override로 주입된 경로는 `module`이 아닌 kind로 보고하고, 같은 호출에서 실제 module index는 계속 `module`로 보고한다.
- 주석과 문자열 안의 가짜 import/export를 무시한다.
- 외부 package import는 project DAG를 indeterminate로 만들지 않으며 해석되지 않은 local import는 숨기지 않는다.
- `import.meta.url`을 쓰는 경로 계산은 dependency로 잡히지 않는다.

### AC-ecmascript-portability — 외부 parser 불필요

- Node 20과 repository dependency만으로 adapter 테스트가 통과한다.

### AC-ecmascript-verification — Semantic case evidence

- 정적 parameterized row와 suite multiplier를 exact count에 반영한다.
- 동적 table, alias와 알 수 없는 문법은 indeterminate이며 skip, todo와 property declaration은 각각 1 case다.

### AC-ecmascript-verification-role — 내용이 역할을 확정한다

- `.spec`/`.test` 접미사와 지원 확장자를 가진 파일만 후보가 된다.
- 후보 중 인식 가능한 case/suite 호출이 하나도 없는 파일은 `unsupported`이며 `discover()` 결과에서 빠진다 — 따라서 boundary·DAG 면제를 받지 못한다.
- case를 담은 후보는 종전대로 `.spec` → `spec-document`, `.test` → `test-record`다.
- count가 `indeterminate`인 후보는 verification으로 남는다. 셀 수 없는 것과 없는 것은 다르다.

## History

- 2026-07-28 — verification role 판정을 접미사 후보 + 내용 확정으로 좁히고, source discovery에서 git이 무시하는 경로를 제외했다.

## Last Updated

2026-07-30 — `package.json`을 비분류 `manifest` entry point로 보고한다. 패키지 루트는 배럴 없이도 진입 선언을 갖고 있어, 면제 대상이 아니라 이미 요구를 충족한 노드다.
