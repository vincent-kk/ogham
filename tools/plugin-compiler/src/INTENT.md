# src — 플러그인 어댑터 생성 파이프라인

## Purpose

`@ogham/plugin-compiler` 소스 루트. **Claude 정본 → facts → 어댑터 내용 → 디스크 반영**의 단방향 파이프라인이며, 진입은 `main.ts` (`sync [--check] [pluginDir ...]`).

## Conventions

- ESM, import 확장자 `.js`; 디렉터리·파일은 camelCase.
- fractal 소비는 배럴(`index.ts`) 경유, organ 소비는 concrete 파일 직접 import.
- 정본 읽기는 facts, 대상 탐색·비교·쓰기는 pipeline, 스트림·exit는 `main.ts`가 소유한다. 변환·진단·인자 해석은 순수하게 유지해 같은 입력의 결과가 디스크 상태에 좌우되지 않게 한다.
- 스펙은 대상 fractal 의 `__tests__/` 에 둔다 (organ 하위에 새로 만들지 않는다).

## Boundaries

### Always do

- JSON emit 은 `stableJson`(2-space + 개행) 단일 경로 — 재실행 무변경(결정성).

### Ask first

- 새 하위 fractal 추가 · facts 계약 확장 — 모든 변환·진단 소비처에 영향.

### Never do

- Claude 소비 파일 쓰기 — 쓰기 대상은 어댑터 경로 상수로 한정.
- 순수 변환·진단 경계에서 디스크 I/O.
