# plugin-compiler

## Purpose

`src/main.ts` 는 `plugin-compiler <extract|compile|verify> <pkgDir>` CLI 오케스트레이터. `extract`=`ir`(현행 산출물→정본 역추출), `compile`=`ir`→`pipeline`(내부적으로 `emit` 호출)→`targets/` 쓰기(`--check` 시 `verify` 게이트로 전환), `verify`=단독 `verify` 게이트. 패키지 전체 계약은 [../INTENT.md](../INTENT.md).

## Structure

| Path         | Role                                                    |
| ------------ | ------------------------------------------------------- |
| `main.ts`    | CLI 진입점 — **`index.ts` 아님**(barrel 이름 트랩 주의) |
| `ir/`        | fractal: `definitions/` ⇄ `PluginIR` 로드/역추출        |
| `profiles/`  | fractal: claude · codex · agy 호스트 규칙               |
| `emit/`      | fractal: `PluginIR`+Profile → `FileMap`(순수)           |
| `pipeline/`  | fractal: emit 실행 + `targets/` 디스크 쓰기             |
| `verify/`    | fractal: 바이트 등가성 게이트                           |
| `types/`     | organ: IR·Profile·Output 계약                           |
| `constants/` | organ: `layout.ts`(경로 상수)                           |
| `tokens/`    | organ(pure): `{{tool}}`/`{{skill}}` 치환·린트           |
| `json/`      | organ(pure): `stableJson`·`jsonEqual`                   |
| `fsx/`       | organ(pure): `readTree`(디렉터리 순회)                  |

## Conventions

- fractal 5개(`ir`/`profiles`/`emit`/`pipeline`/`verify`)는 각자 INTENT.md 보유 — 이 문서는 소스 루트 조감도, 세부 계약은 하위 INTENT.md 참조.
- organ 5개(`types`/`constants`/`tokens`/`json`/`fsx`)는 flat 단일·소수 파일, INTENT.md 없음.
- 커맨드 흐름은 `ir → pipeline(→emit→verify) → targets/` 단방향 — 역방향 import 금지.

## Boundaries

### Always do

- 새 하위 fractal 추가 시 INTENT.md + `index.ts` barrel 갖추기.
- `main.ts` 는 각 fractal의 barrel(`index.ts`)만 import — 하위 파일 직접 참조 금지.

### Ask first

- `main.ts` 커맨드(`extract`/`compile`/`verify`) 추가·시그니처 변경 — CLI 계약 영향.
- `src` 최상위에 새 organ/fractal 추가.

### Never do

- `src` 루트에 barrel/INTENT.md/`main.ts` 외 peer 파일 추가.
- 한 fractal 내부 파일(`steps/`·`compile/`·`load/` 등)을 다른 fractal이 직접 import — 항상 barrel 경유.

## Dependencies

- 패키지 개발 의존성·채택 상태는 [../INTENT.md](../INTENT.md) 참조(여기 중복 금지).
