# ecmascript — initial ecosystem adapter

## Purpose

현재 JavaScript/TypeScript 생태계의 소스 파일과 module/framework/manifest entry point를 **발견**하고, 그 생태계의 이름 규칙(확장자, entry 이름, `.spec`·`.test` 접미사, framework 패키지)을 소유한다. 파일 내용의 판독은 추출 프로그램(`src/factsExtractor`)의 몫이다.

## Conventions

- 이 디렉터리가 확장자, entry filename, package/framework 이름과 verification 이름 규칙의 유일한 출처다. 추출 프로그램은 그 상수를 복제하지 않고 직접 가져간다(DETAIL의 Boundary Exemptions).
- 파일의 내용은 읽지 않는다. manifest(`package.json`)만 JSON으로 읽는다.
- 정적 확정이 불가능하면 indeterminate를 반환한다.

## Boundaries

### Always do

- framework convention은 package evidence와 exact peer path로 보고
- adapter별 entry override를 exact peer filename으로만 해석
- Node 20-compatible recursive filesystem traversal 사용
- source discovery에서 git이 무시하는 경로를 `lib/createIgnoreFilter`로 제외

### Ask first

- 지원 확장자, framework convention 또는 이름 규칙 ownership 범위 확대
- discovery가 파일 내용을 보게 만드는 변경

### Never do

- `@ast-grep/napi`, TypeScript compiler API 또는 global module 탐색 요구
- 생태계 상수를 core/constants로 이동
- 소스 파일의 내용을 구문으로 해석 — 그 판단은 레코드에서 온다
- 동적 구문을 exact로 가장
- `.gitignore` 문법을 직접 해석하거나 git 부재를 discovery 실패로 취급

## Dependencies

- `../../types/`, `../../lib/` ignore filter, Node filesystem/path APIs
