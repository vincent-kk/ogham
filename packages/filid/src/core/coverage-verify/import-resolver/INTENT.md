# import-resolver -- import 소스를 절대 파일 경로로 해석

## Purpose

`extractDependencies`가 추출한 raw import source 문자열을
현재 파일 기준 절대 경로로 해석한다. `usage-tracker` 내부 전용 유틸.

## Scope

- 상대 경로(`./`, `../`) 및 절대 경로(`/`)만 해석
- ESM 규약: `.js → .ts/.tsx`, `.mjs → .mts` 치환
- 확장자 없는 경로에 `.ts/.tsx/.js/.mjs` 순차 시도
- index 해석: `./dir` → `./dir/index.{ts,tsx,js}`
- 해석 불가 시 `null` 반환

## Out of scope

- Bare specifier(패키지명, `node:` 프리픽스) — `null` 반환
- tsconfig.json `paths` 별칭(`@/` 등)
- `node_modules` 패키지 해석
- Barrel re-export 추적

## Boundaries

### Always do
- `existsSync` 기반 검증만 수행 (파일 내용 읽지 않음)
- 실패는 `null`로 반환, 예외 전파 금지

### Ask first
- 공개 시그니처 `resolveImportPath` 변경
- tsconfig paths / node_modules / barrel 지원 확장
- 확장자 우선순위 변경

### Never do
- 파일 내용 파싱 또는 AST 분석
- 네트워크·외부 프로세스 호출
- 상위 모듈(`coverage-verify`, `usage-tracker`)에서 직접 import되는 공개 API로 재분류
