# src — 플러그인 어댑터 생성 파이프라인

## Purpose

`@ogham/plugin-compiler` 소스 루트. **Claude 정본 → facts → 어댑터 내용 → 디스크 반영**의 단방향 파이프라인이며, 진입은 `main.ts` (`sync [--check] [pluginDir ...]`).

## Conventions

- ESM, import 확장자 `.js`; 디렉터리·파일은 camelCase.
- fractal 소비는 배럴(`index.ts`) 경유, organ 소비는 concrete 파일 직접 import.
- 부수효과는 `pipeline/`(디스크)과 `main.ts`(스트림·exit) 두 곳뿐 — 나머지는 순수 함수.
- 스펙은 대상 fractal 의 `__tests__/` 에 둔다 (organ 하위에 새로 만들지 않는다).

## Boundaries

### Always do

- JSON emit 은 `stableJson`(2-space + 개행) 단일 경로 — 재실행 무변경(결정성).

### Ask first

- 새 하위 fractal 추가 · facts 계약 확장 — 모든 변환·진단 소비처에 영향.

### Never do

- Claude 소비 파일 쓰기 — 쓰기 대상은 어댑터 경로 상수로 한정.
- 순수 변환·진단 경계에서 디스크 I/O.
