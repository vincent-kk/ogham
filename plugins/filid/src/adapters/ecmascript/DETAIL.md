# ecmascript adapter — Contract

## Requirements

- adapter는 현재 생태계 source file과 package/framework evidence를 탐지한다.
- module, executable과 framework entry point를 exact path와 adapter ID로 보고한다.
- entry point의 named exports, direct declarations와 certainty를 lexical scan으로 판정한다.
- static/dynamic import, re-export와 지원 가능한 framework dependency를 추출하고 local specifier를 정규화한다.
- strings, comments와 template text 안의 가짜 syntax를 dependency나 export로 세지 않는다.
- 지원 불가능한 alias·동적 표현은 unsupported/indeterminate evidence를 남긴다.
- verification 동작은 작업 2의 15/32와 contract-marker 계약을 구현한다.

## API Contracts

- `ecmascriptStructureAdapter: StructureAdapter` — registry에 등록되는 초기 structure adapter.
- `scanLexicalTokens(source)` — comment/string/template와 delimiter nesting을 보존한 lexical token stream.
- `extractDependencyReferences(filePath)` — adapter 중립 `DependencyReference[]`.
- `findEntryPoints(directoryPath)` — module/executable/framework descriptor 배열.
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
- 주석과 문자열 안의 가짜 import/export를 무시한다.

### AC-ecmascript-portability — 외부 parser 불필요

- Node 20과 repository dependency만으로 adapter 테스트가 통과한다.

### AC-ecmascript-verification — Semantic case evidence

- 정적 parameterized row와 suite multiplier를 exact count에 반영한다.
- 동적 table, alias와 알 수 없는 문법은 indeterminate이며 skip, todo와
  property declaration은 각각 1 case다.

## Last Updated

2026-07-26 — 초기 생태계의 structure·verification 책임을 adapter 내부로 고정했다.
