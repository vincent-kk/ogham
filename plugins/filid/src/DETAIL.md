# src contract

## Requirements

- 레이어 의존 방향은 `mcp`/`hooks` → `core` → `adapters` → `types`/`constants`/`lib` 한 방향이며 역방향 edge는 0이다.
- `core`는 생태계 리터럴을 알지 못한다. 확장자, 진입점 파일명, import 문법, 테스트 호출 문법은 `adapters/` 안에만 존재한다.
- `mcp`와 `hooks`는 host 경계이며 정책 판단을 하지 않는다.
- 새 생태계는 core, policy, MCP DTO 수정 없이 어댑터 등록만으로 추가된다.
- 소스 루트 named entry point는 FCA 경계 식별용으로 `VERSION`만 열거하고, npm manifest에는 library export를 선언하지 않는다.
- `version.ts`는 `scripts/injectVersion.mjs`가 만드는 생성물이며 손으로 고치지 않는다.

## API Contracts

- MCP 도구 4개: `project_setup`, `fractal_inspect`, `restructure`, `review_state`.
- `fractal_inspect`의 `resolve` action은 최소 한 item의 `requests[]`를 한 shared snapshot에서 해석하고 입력 순서의 `data.results[]`를 반환한다.
- 훅 진입점 3개: `hooks/setup`, `hooks/userPromptSubmit`, `hooks/preToolUse`.
- 소스 루트 entry point의 공개 surface는 생성된 `VERSION` 하나다.
- 모든 MCP 반환은 공통 envelope와 16 KiB inline 예산을 따른다.

## Acceptance Criteria

### AC-src-layering — 단방향 레이어

- `adapters/`에서 `core/`를 참조하는 import가 0건이다.
- `core/`와 MCP DTO에 생태계 확장자·테스트 호출 리터럴이 없다.

### AC-src-surface — 1.0 표면

- MCP 도구가 정확히 4개 등록된다.
- 소스 루트 entry point가 `VERSION`만 named export하고 npm manifest에는 library export가 없다.

### AC-src-generated — 생성물 불가침

- `version.ts`, `bridge/`, `public/`, host 매니페스트는 생성기가 소유하며 손편집 흔적이 없다.

## Boundary Exemptions

### `version.ts` — Generated version constant is imported directly inside the owner

- **Consumers**: `**/src/**`
- **Direct import**: allowed
- **Reason**: 같은 fractal 내부 소비자는 자기 entry point를 경유하지 않고 concrete peer를 직접 참조한다. `version.ts`는 생성된 단일 상수 파일이고 아무것도 import하지 않아 런타임 순환을 만들지 않는다.

## History

- 2026-09-05 — setup, inspection과 restructure lifecycle을 action-dispatched 도구로 병합해 MCP 표면을 4개로 줄였다.
- 2026-08-28 — 대규모 변경의 반복 snapshot 비용을 없애기 위해 `context_resolve` 공개 DTO를 array-first batch로 바꿨다.

## Last Updated

2026-09-05 — 4-tool MCP 표면과 resolve action batch 계약을 명시했다.
