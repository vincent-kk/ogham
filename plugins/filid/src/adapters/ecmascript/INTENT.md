# ecmascript — initial ecosystem adapter

## Purpose

현재 JavaScript/TypeScript 생태계의 파일, module/framework entry point, import/export와 verification syntax를 lexical evidence로 해석한다.

## Structure

- `structure/` organ — source discovery, lexical token scan, entry point와 dependency evidence
- `verification/` organ — verification role, semantic case와 contract marker 분석
- `index.ts` — 등록 가능한 structure/verification adapter named exports

## Conventions

- 이 디렉터리가 확장자, entry filename, package/framework 이름과 test syntax의 유일한 출처다.
- 문자열·주석·괄호 nesting을 구분하는 작은 lexical scanner를 공유한다.
- 정적 확정이 불가능하면 indeterminate를 반환한다.

## Boundaries

### Always do

- dependency에 source file, raw specifier, resolved path와 kind를 보존
- framework convention은 package evidence와 exact peer path로 보고
- adapter별 entry override를 exact peer filename으로만 해석
- Node 20-compatible recursive filesystem traversal 사용

### Ask first

- 지원 확장자, framework convention 또는 syntax ownership 범위 확대
- lexical scanner가 해석하는 문법 범위 변경

### Never do

- `@ast-grep/napi`, TypeScript compiler API 또는 global module 탐색 요구
- 생태계 상수를 core/constants로 이동
- 동적 구문을 exact로 가장

## Dependencies

- `../../types/`, Node filesystem/path APIs
