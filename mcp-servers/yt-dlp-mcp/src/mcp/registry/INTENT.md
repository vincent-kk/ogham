## Purpose

알려진 모든 도구 목록(`TOOL_REGISTRY`)을 보관하고, enable 플래그 게이트(`isToolEnabled`)에 따라 서버에 등록한다(`registerEnabledTools`).

## Boundaries

### Always do

- 배열 순서를 `tools/list` 노출 순서로 유지한다
- `enabledBy: 'default'` 도구는 항상 켠다

### Ask first

- 레지스트리 순서·게이트 규칙 변경

### Never do

- 비활성 도구를 등록한다
