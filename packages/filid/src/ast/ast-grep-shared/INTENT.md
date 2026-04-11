# ast-grep-shared -- ast-grep 로더와 공유 유틸

## Purpose

`@ast-grep/napi`를 lazy 로딩하고, 언어 문자열을 `Lang` 열거형으로 변환하며, 디렉토리에서 언어별 파일을 수집하고, 매치 결과를 사람 친화적으로 포맷한다. 모든 ast 분석 모듈이 공유하는 로더·파일 탐색·포맷터 organ.

## Structure

- `ast-grep-shared.ts` — `getSgModule`, `getSgLoadError`, `toLangEnum`, `getFilesForLanguage`, `formatMatch`, `SUPPORTED_LANGUAGES` / `EXT_TO_LANG` re-export
- `utils/` organ — `getMappedLang` 등 내부 보조 함수

## Conventions

- 모듈 로딩은 `createRequire`(CJS) 우선, 실패 시 dynamic `import`(ESM) 폴백
- 로딩 실패는 한 번만 기록 (`sgLoadFailed` 플래그) — 반복 시도 금지
- 언어 매핑은 `constants/ast-languages.ts`의 `EXT_TO_LANG`/`SUPPORTED_LANGUAGES`가 단일 소스
- `getFilesForLanguage`는 `AST_MAX_FILES` 상한과 `AST_SKIP_DIRS` 제외 목록을 강제
- 매치 포맷은 `>` 프리픽스 + 1-based 라인 번호 (`4` 자리 패딩)

## Boundaries

### Always do

- 새 언어 추가 시 `EXT_TO_LANG`·`SUPPORTED_LANGUAGES`·`getMappedLang` 세 곳을 동시에 갱신
- 모듈 캐시는 파일 내 모듈 스코프 (`sgModule`)로만 유지

### Ask first

- 파일 탐색에 `fast-glob` 도입 (현재 `readdirSync` 재귀)
- `AST_MAX_FILES` 기본값 변경

### Never do

- `@ast-grep/napi`를 top-level import (lazy 로딩 필수)
- 매치 포맷에 ANSI 색상 코드 삽입 (JSON 파이프 호환성)

## Dependencies

- `@ast-grep/napi` (optional peer, lazy)
- `node:fs`, `node:path`, `node:module` (`createRequire`)
- `../../constants/ast-languages.js`, `../../types/index.js` (`SgModule`, `NapiLang`)
