# hooks (plugin mapping) contract

## Requirements

- Claude Code 플러그인의 자동 실행 계층 매핑을 담는 canonical 설정 노드다.
- 3개 lifecycle 이벤트를 `bridge/claude/*.mjs` 스크립트에 매핑한다.
- 이 디렉터리는 설정 자산이며 코드 모듈이 아니다. 진입점을 갖지 않는다.
- `hooks.json`은 손편집 대상이다. host별 파생 매니페스트는 plugin-compiler가 생성한다.

## API Contracts

등록 형식과 이벤트별 값은 canonical hook 설정에서 확인한다. host별 파생 매니페스트는 compiler가 소유한다.

## Acceptance Criteria

### AC-hookmap-events — 세 이벤트만

- SessionStart, UserPromptSubmit, PreToolUse만 등록되며 각 command가 `bridge/claude/`의 실제 번들을 가리킨다.

## Last Updated

등록하는 lifecycle 이벤트나 `hooks.json`과 파생 매니페스트의 소유 관계가 바뀔 때 갱신한다.
