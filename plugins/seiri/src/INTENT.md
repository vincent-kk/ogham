# src — seiri 소스 루트

## Purpose

`@ogham/seiri` 의 소스 루트. 코드 작성 품질·리뷰 규율·개발 방법론 규칙을 현재 호스트의 프로젝트 규칙 채널로 배포하고, 그 상태를 세션과 작업 원장에 보고한다. **규칙 본문을 주입하지 않는다** — 배포된 파일은 하니스가 로드한다.

## Structure

공개 진입점은 named re-export만 담고 구현하지 않는다. 버전 상수는 동기화 명령이 만드는 생성물이므로 직접 수정하지 않는다.

## Conventions

- ESM (`"type": "module"`), import 확장자 `.js`.
- 경로 조합·비교는 `@ogham/cross-platform` 경유 — 네이티브 `node:path` 금지. 프로젝트 신원이 경로에서 나오므로 러너마다 달라지면 안 된다.
- `hostPaths` 는 MCP 전용 — 훅은 호스트가 주는 `CLAUDE_PLUGIN_ROOT` 와 cwd 를 쓴다.
- 훅 도달 코드는 플러그인 내부 배럴이 아니라 concrete 파일을 직접 import 한다. 공유 패키지는 루트에서 가져온다.
- `version.ts` 는 `yarn version:sync` 로만 갱신.

## Boundaries

### Always do

- 새 모듈 추가 시 `index.ts` 에 named export 추가.
- 규칙 변경은 `planRuleDocs` 의 target·revision 과 함께 미리 보여준다.

### Ask first

- 새 하위 디렉토리 추가 (계층은 3개가 설계 상한).
- 공개 API 제거·시그니처 변경.

### Never do

- `version.ts` 직접 수정.
- `types/`·`constants/` 에 로직 추가.
- 순환 의존 도입 (core ↔ mcp ↔ hooks).
