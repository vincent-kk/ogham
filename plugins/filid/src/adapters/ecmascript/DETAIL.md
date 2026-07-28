# ecmascript adapter — Contract

## Requirements

- adapter는 현재 생태계 source file과 package/framework evidence를 탐지한다.
- module, executable과 framework entry point를 exact path와 adapter ID로 보고한다.
- config가 이 adapter에 전달한 exact peer filename은 declared entry override로
  해석하며 **`kind: 'module'`로 보고하지 않는다.** module은 adapter가 스스로
  알아본 module index에만 쓰는 kind이고, 분류기는 그 kind 하나만 읽는다.
  override가 module이면 config 한 줄이 디렉터리를 fractal로 바꿔버린다.
- override는 `kind: 'executable'`, `surface: 'enumerated'`로 보고한다.
  `framework`는 surface를 `opaque`로 끌어내려 정당한 override마다 영구적인
  `entry-point-surface` 경고를 만든다 — override는 그 규칙의 입력이지
  위반 원인이 아니다.
- entry point의 named exports, direct declarations와 certainty를 lexical scan으로 판정한다.
- static/dynamic import와 re-export 중 project-internal dependency를 추출하고
  local specifier를 정규화한다.
- package-level external dependency는 project DAG 후보에서 제외하고, 해석할
  수 없는 local dependency는 `resolvedPath: null`로 보존한다.
- strings, comments와 template text 안의 가짜 syntax를 dependency나 export로 세지 않는다.
- `import.meta`는 dependency가 아니다. `import` 뒤에 `.`이 오면 메타 속성
  참조이므로 뒤따르는 문자열을 specifier로 읽지 않는다. 이를 구분하지 않으면
  `join(dirname(fileURLToPath(import.meta.url)), '../..')` 같은 경로 계산이
  해석 불가 dependency로 잡혀 그래프 전체가 `indeterminate`가 된다.
- 지원 불가능한 alias·동적 표현은 unsupported/indeterminate evidence를 남긴다.
- verification 동작은 작업 2의 15/32와 contract-marker 계약을 구현한다.
- verification role은 **파일명 접미사가 후보를 고르고 파일 내용이 확정한다.**
  `.spec`/`.test` stem은 후보일 뿐이며, 인식 가능한 case/suite 호출이 하나도
  없는 파일은 `unsupported`다. 접미사만으로 역할을 주면 프로덕션 파일을
  `x.spec.ts`로 개명하는 것만으로 boundary와 DAG 면제를 얻는다 — 개명은
  증거가 아니다.

## API Contracts

- `ecmascriptStructureAdapter: StructureAdapter` — registry에 등록되는 초기 structure adapter.
- `scanLexicalTokens(source)` — comment/string/template와 delimiter nesting을 보존한 lexical token stream.
- `extractDependencyReferences(filePath)` — adapter 중립 `DependencyReference[]`.
- `findEntryPoints(directoryPath, overrides?)` —
  module/executable/framework/configured descriptor 배열.
- `ecmascriptVerificationAdapter` — spec/test role, semantic case count와
  contract group marker를 분석하는 초기 verification adapter.
- `countSemanticCases(source)` — 일반/skip/todo/property와 정적 parameterized
  rows를 의미론적 case 수로 계산하고 동적 구조를 indeterminate로 반환.
- `extractContractGroupIds(source)` — comment의 `filid:contract` marker 추출.
- `ECMASCRIPT_ADAPTER_ID` — config와 evidence가 공유하는 안정 adapter ID.

## Acceptance Criteria

### AC-ecmascript-detection — 생태계 claim

- package 또는 지원 source evidence가 있으면 양수 confidence를 반환한다.
- 알 수 없는 파일만 있는 project는 ownership을 주장하지 않는다.

### AC-ecmascript-structure — entry와 dependency

- module·executable·framework entry point를 구분하고 named surface를 검사한다.
- 다른 adapter ID의 override와 섞지 않고 전달된 exact filename만 인식한다.
- override로 주입된 경로는 `module`이 아닌 kind로 보고하고, 같은 호출에서
  실제 module index는 계속 `module`로 보고한다.
- 주석과 문자열 안의 가짜 import/export를 무시한다.
- 외부 package import는 project DAG를 indeterminate로 만들지 않으며
  해석되지 않은 local import는 숨기지 않는다.
- `import.meta.url`을 쓰는 경로 계산은 dependency로 잡히지 않는다.

### AC-ecmascript-portability — 외부 parser 불필요

- Node 20과 repository dependency만으로 adapter 테스트가 통과한다.

### AC-ecmascript-verification — Semantic case evidence

- 정적 parameterized row와 suite multiplier를 exact count에 반영한다.
- 동적 table, alias와 알 수 없는 문법은 indeterminate이며 skip, todo와
  property declaration은 각각 1 case다.

### AC-ecmascript-verification-role — 내용이 역할을 확정한다

- `.spec`/`.test` 접미사와 지원 확장자를 가진 파일만 후보가 된다.
- 후보 중 인식 가능한 case/suite 호출이 하나도 없는 파일은 `unsupported`이며
  `discover()` 결과에서 빠진다 — 따라서 boundary·DAG 면제를 받지 못한다.
- case를 담은 후보는 종전대로 `.spec` → `spec-document`,
  `.test` → `test-record`다.
- count가 `indeterminate`인 후보는 verification으로 남는다. 셀 수 없는 것과
  없는 것은 다르다.

## Last Updated

2026-07-28 — verification role 판정을 접미사 후보 + 내용 확정으로 좁혀 개명만으로 얻는 면제를 없앴다.
