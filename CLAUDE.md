# ogham

Claude Code 플러그인 모노레포. 사용자용 카탈로그는 [README.md](./README.md), 저장소 규칙은 [AGENTS.md](./AGENTS.md)를 따른다.

## Context loading

- 플러그인 작업은 해당 `plugins/<name>/INTENT.md`에서 시작하고, 수정 경로에 더 가까운 `INTENT.md`·`DETAIL.md`를 우선한다.
- `CLAUDE.md`에는 코드·매니페스트에서 드러나지 않는 결합 관계와 판단 근거만 둔다. 명령, 의존성, 파일 목록은 각 `package.json`과 소스 트리를 정본으로 삼는다.

## Generated surfaces

- `.codex-plugin/`, 루트 `plugin.json`, `mcp_config.json`, `hooks.json`은 plugin compiler 산출물이다. 원본 매니페스트·스킬·훅을 수정한 뒤 재생성하며 손편집하지 않는다.
- `bridge/`와 `public/`은 패키지가 배포하는 런타임 산출물이라 커밋될 수 있지만 손편집하지 않는다. 패키지별 생성 권한은 더 가까운 `CLAUDE.md`가 우선한다.

## Hidden loader and bundle rules

- `agents/`는 런타임이 자동 발견한다. 원본 `.claude-plugin/plugin.json`에도 `agents` 필드를 추가하지 않는다.
- agent·skill의 MCP 참조는 `mcp__plugin_<plugin>_tools__<tool>` 전체 이름을 쓴다. `mcp_tools_*` 축약형은 서브에이전트의 도구 grant에서 해석되지 않는다.
- 공유 패키지는 훅에서도 패키지 루트만 import한다. 각 패키지의 `sideEffects: false`가 비기여 재노출을 제거하며, 플러그인 내부 모듈은 기존 concrete 경계를 유지한다. 훅 변경 뒤에는 번들 크기·출력 금지 패턴 가드를 실행한다.
