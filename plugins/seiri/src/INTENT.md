# src — seiri 소스 루트

## Purpose

`@ogham/seiri` 의 소스 루트. 코드 작성 품질·리뷰 규율·개발 방법론 규칙을
대상 저장소의 `.claude/rules/` 로 배포하고, 그 상태를 세션에 보고한다.
**규칙 본문을 주입하지 않는다** — 배포된 파일은 하니스가 로드한다.

## Structure

| 경로         | 역할                                               |
| ------------ | -------------------------------------------------- |
| `index.ts`   | 공개 API 배럴 (named re-export 만)                 |
| `version.ts` | 자동 생성 버전 상수 (직접 수정 금지)               |
| `core/`      | 설정(다이얼) · 규칙 문서 배포/상태/드리프트        |
| `mcp/`       | MCP 서버 + 도구 2개 + 설정 페이지 자산             |
| `hooks/`     | SessionStart · InstructionsLoaded 구현체           |
| `constants/` | 공유 상수 organ (경로 리터럴 · 다이얼 · 도구 이름) |
| `types/`     | 공유 타입 organ                                    |

## Conventions

- ESM (`"type": "module"`), import 확장자 `.js`.
- 경로 조합·비교는 `@ogham/cross-platform/compat` 경유 — 네이티브 `node:path`
  금지. 프로젝트 신원이 경로에서 나오므로 러너마다 달라지면 안 된다.
- `hostPaths` 는 MCP 전용 — 훅은 호스트가 주는 `CLAUDE_PLUGIN_ROOT` 와 cwd 를
  쓴다.
- 훅 도달 코드는 배럴이 아니라 concrete 파일을 직접 import 한다.
- `version.ts` 는 `yarn version:sync` 로만 갱신.

## Boundaries

### Always do

- 새 모듈 추가 시 `index.ts` 에 named export 추가.
- 규칙 파일을 건드리는 변경은 `planRuleDocs` 로 미리 보여줄 수 있게 유지.

### Ask first

- 새 하위 디렉토리 추가 (계층은 3개가 설계 상한).
- 공개 API 제거·시그니처 변경.

### Never do

- `version.ts` 직접 수정.
- `types/`·`constants/` 에 로직 추가.
- 순환 의존 도입 (core ↔ mcp ↔ hooks).
