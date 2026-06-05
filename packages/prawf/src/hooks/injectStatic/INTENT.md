# injectStatic -- SessionStart 정적 배너 주입

## Purpose

세션 시작 시 고정 배너를 `additionalContext` 로 1회 출력하는 stub 훅. 어떤 예외에도 세션을 차단하지 않는다.

## Structure

- `injectStatic.ts` — `buildBanner()` (배너 텍스트 빌더)
- `build/injectStatic.entry.ts` — esbuild 번들 진입점 (buildBanner → stdout)

## Conventions

- `node:*` 빌트인만 사용
- payload envelope 고정

## Boundaries

### Always do

- 출력 envelope: `{ continue: true, hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext } }`
- 어떤 예외에도 `process.exit(0)` 유지

### Ask first

- payload 내용·헤더 변경

### Never do

- 외부 npm 모듈 import (cap 위반)
- 디스크 write

## Dependencies

- `node:process` (stdout/stderr)
