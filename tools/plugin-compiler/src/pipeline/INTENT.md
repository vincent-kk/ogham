## Purpose

컴파일 단계를 실행하고 산출물을 디스크에 쓰는 fractal. 순수 emit(`emitPlugin`)과 부수효과(디스크 쓰기)를 분리한다.

## Structure

| Path                       | Role                                          |
| -------------------------- | --------------------------------------------- |
| `index.ts`                 | barrel — `compilePlugin` · `writeTargets`     |
| `compile/compilePlugin.ts` | load → 호스트별 emit → `CompileResult` (순수) |
| `compile/writeTargets.ts`  | `FileMap` → `targets/<host>/` (clean regen)   |

## Conventions

- `compilePlugin` 은 디스크에 쓰지 않는다 — 테스트·등가 게이트가 순수 결과를 소비.
- `writeTargets` 는 각 호스트 루트를 먼저 삭제(stale 파일 잔존 방지).
- emit 실패는 throw 가 아니라 `diagnostics` 에 error — 한 호스트 실패가 나머지를 막지 않음.

## Boundaries

### Always do

- 디스크 쓰기는 `writeTargets` 단일 진입점.

### Ask first

- `targets/` 외 위치로 산출물 쓰기.

### Never do

- `compilePlugin` 에서 디스크 쓰기 (순수성 유지).

## Dependencies

- `ir`, `emit`, `profiles`, `types/output`.
