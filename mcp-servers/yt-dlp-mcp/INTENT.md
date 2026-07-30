## Purpose

`@ogham/yt-dlp-mcp` 배포 경계. yt-dlp 실행을 MCP 서버로 감싸 npm/npx로 배송한다. 구현 경계는 [src/INTENT.md](./src/INTENT.md)가 소유하며 이 문서는 패키지가 무엇을 약속하고 무엇을 배송하는지만 다룬다.

## Structure

| 경로                                | 역할                                                 |
| ----------------------------------- | ---------------------------------------------------- |
| `package.json`                      | 공개 표면 선언(`exports`·`bin`)이자 이 노드의 진입점 |
| `src/`                              | 구현 fractal — 자체 계약을 가진다                    |
| `dist/`                             | 빌드 산출물. 배송되는 것은 이것뿐이다                |
| `docs/`                             | 아키텍처·레이트리밋 참고 문서                        |
| `tsconfig*.json` `vitest.config.ts` | 타입·검증 설정                                       |

## Conventions

- 공개 표면은 배럴이 아니라 `exports` 맵이다. 소비자는 그 맵을 통과하며 `src`나 `dist` 내부 경로를 직접 집지 않는다.
- 실행 진입점과 라이브러리 진입점은 같은 파일이다 — `bin`과 `exports`가 한 대상을 가리킨다.
- 이 저장소에서 실제로 npm에 배송되는 종류의 노드다. 플러그인의 `main`·`files`는 남은 선언이지만 여기서는 배포 사실이다.

## Boundaries

### Always do

- 표면을 바꿀 때 `exports`와 `src/index.ts`를 같은 편집에서 맞춘다
- 배송 범위를 `files`가 선언한 것으로 한정한다

### Ask first

- `exports` 서브패스 추가 또는 `bin` 이름 변경
- 런타임 의존성 추가

### Never do

- private 워크스페이스 패키지(`@ogham/*`)를 런타임 의존성으로 요구 — 배포본이 설치 불가가 된다
- `dist/`를 손편집하거나 커밋된 산출물을 정본으로 취급

## Dependencies

- 런타임: `@modelcontextprotocol/sdk`, `execa`, `p-limit`, `pino`, `zod`, 런타임에 획득하는 yt-dlp 바이너리
- 개발: Node.js ≥20, TypeScript, esbuild, tsc-alias, Vitest
