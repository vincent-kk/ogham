# yt-dlp-mcp — Contract

## Requirements

- 패키지는 `exports` 맵의 `.` 하나로만 소비된다. 서브패스를 늘리는 것은 공개 계약 변경이다.
- 배송 범위는 `files`가 선언한 `dist`와 `README.md`뿐이며 `src`는 배송되지 않는다. 따라서 `src` 내부 경로에 대한 외부 계약은 존재하지 않는다.
- 실행과 라이브러리 진입이 같은 대상이다. `bin`과 `exports['.'].import`가 서로 다른 파일을 가리키면 npx 실행과 import가 다른 코드를 돌린다.
- 런타임 의존성은 공개 npm 패키지로 한정한다. private 워크스페이스 패키지를 넣으면 배포본이 설치 불가가 되므로, 크로스 플랫폼 처리는 `execa`와 Node 표준 API로 해결한다.
- `src/version.ts`가 `package.json`을 읽어 버전을 단일 출처로 삼는다. 이 참조가 패키지 루트를 넘지 않도록 루트가 이 fractal의 경계다.

## API Contracts

- `exports['.']` — `dist/index.d.ts` 타입과 `dist/index.js` 런타임. 이 패키지의 유일한 공개 진입이다.
- `bin` — 같은 `dist/index.js`. `npx @ogham/yt-dlp-mcp`로 stdio MCP 서버가 뜬다.
- `package.json` 자체가 이 노드의 adapter-reported entry point다. 배럴이 아니라 이 선언이 표면을 열거한다.

## Acceptance Criteria

### AC-package-surface — 선언된 공개 표면

- `exports` 맵은 `.` 하나만 선언하고, `bin`과 같은 대상을 가리킨다.
- `files`는 `dist`와 README만 담는다.

### AC-package-independence — 워크스페이스 비의존

- `dependencies`에 `@ogham/` 접두 private 패키지가 없다.

## Boundary Exemptions

### `package.json` — Version single source

- **Consumers**: `**/src/version.ts`
- **Direct import**: `allowed`
- **Reason**: 버전은 매니페스트에만 있고 매니페스트는 이 fractal의 진입점 자신이라 경유할 다른 진입점이 없다. 버전을 재노출하는 배럴을 세워도 그 배럴이 같은 매니페스트를 읽어야 하므로 경계 통과가 한 단계 늘어날 뿐이다.

## Last Updated

2026-07-30 — 패키지 루트를 fractal로 선언했다. `src/version.ts`의 `../package.json` 참조가 소유 fractal 없는 경로로 나가 저장소 전체 dependency graph를 indeterminate로 만들고 있었다.
