# hooks — Contract

## Requirements

- 훅은 둘이다: SessionStart 에서 정적 정책 1회(`injectStatic`), UserPromptSubmit 마다 카운터·drift 상태(`injectDynamic`).
- 세 provider(codex·antigravity·claude)를 지원한다.
- **어느 훅도 세션을 차단하지 않는다.** 어떤 예외에도 정상 종료한다.
- config·counter 파일에 쓰지 않는다 — 훅은 읽기 전용이다.
- 진입점(`*.entry.ts`)은 esbuild 가 `bridge/*.mjs` 로 번들한다. 훅 도달 코드는 배럴이 아니라 concrete 파일을 직접 import 한다.
- `additionalContext` 에 cwd·session ID·프롬프트 원문을 싣지 않는다. 매치된 키워드만 노출한다.

## API Contracts

- `injectStatic/` — SessionStart 정적 정책 블록.
- `injectDynamic/` — UserPromptSubmit 2–3줄 라이브 상태.
- `shared/` — 두 훅이 공유하는 config 로드·provider 순서·electable 판정 organ.

## Acceptance Criteria

### AC-hooks-readonly — 읽기 전용

- 훅 실행이 구성과 런타임 카운터 파일을 쓰지 않는다.

### AC-hooks-never-block — 비차단

- config 부재·손상·stdin 실패에서도 세션이 진행된다.

### AC-no-context-leak — 컨텍스트 누설 없음

- 주입 문자열에 cwd·session ID·프롬프트 원문이 없다.

## Boundary Exemptions

### shared — Hook bundles cannot pass through a barrel

- **Consumers**: `**/src/hooks/**`, `**/src/__tests__/**`
- **Direct import**: allowed
- **Reason**: 훅은 esbuild 번들로 배송되고 크기 가드를 받는다. 배럴을 거치면 재노출 그래프 전체가 번들에 들어와 가드를 넘긴다. e2e 헬퍼도 같은 이유로 실제 번들이 쓰는 concrete 경로를 그대로 실행해야 한다.

## Last Updated

2026-08-23 — 읽기 전용 수용 기준을 실제 런타임 파일 소유권에 맞게 표현했다.
