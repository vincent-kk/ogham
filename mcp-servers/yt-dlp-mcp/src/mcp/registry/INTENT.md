## Purpose

MCP 도구의 노출 순서와 활성화 게이트를 소유한다. 도구 실행 로직은 각 도구가 소유한다.

## Conventions

- 배열 순서는 `tools/list` 노출 순서다. 소비자가 보는 순서를 임의로 바꾸지 않는다.
- 모든 도구는 고유 `enabledBy` 플래그를 가지며 특수 default 값은 두지 않는다. 기본 활성값은 `TOOL_DEFAULT_ENABLED`에만 둔다.
- 활성화 판정과 등록은 이 모듈에 모으고 결과를 로그로 남긴다. 호출부의 독립 분기가 설정을 우회하는 것을 막는다.

## Boundaries

### Always do

- 배열 순서를 `tools/list` 노출 순서로 유지한다
- 새 도구는 `TOOL_REGISTRY` 배열과 `constants`의 `TOOL_DEFAULT_ENABLED`에 함께 등재한다

### Ask first

- 레지스트리 순서·게이트 규칙 변경

### Never do

- 비활성 도구를 등록한다
