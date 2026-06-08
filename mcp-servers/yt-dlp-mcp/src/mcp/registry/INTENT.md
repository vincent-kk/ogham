## Purpose

알려진 모든 도구 목록(`TOOL_REGISTRY`)을 보관하고, enable 플래그 게이트(`isToolEnabled`)에 따라 서버에 등록한다(`registerEnabledTools`).

## Structure

| 파일/디렉터리 | 역할                                                                                  |
| ------------- | ------------------------------------------------------------------------------------- |
| `registry.ts` | `TOOL_REGISTRY` 배열 + `isToolEnabled` 게이트 + `registerEnabledTools` 등록 루프 구현 |
| `index.ts`    | barrel: `TOOL_REGISTRY`·`isToolEnabled`·`registerEnabledTools` 재노출                 |

## Conventions

- `TOOL_REGISTRY` 배열 순서가 곧 `tools/list` 노출 순서이므로 임의로 재정렬하지 않는다
- 모든 도구는 자기 `enabledBy` flag를 가지며('default' 특수값 없음), 기본 활성값은 `constants`의 `TOOL_DEFAULT_ENABLED`가 정한다
- 활성화 판정은 `isToolEnabled` 단일 함수에 모으고 호출부에서 따로 분기하지 않는다
- 서버 등록 루프는 `registerEnabledTools`만 담당하며 등록 결과를 로거로 남긴다

## Boundaries

### Always do

- 배열 순서를 `tools/list` 노출 순서로 유지한다
- 새 도구는 `TOOL_REGISTRY` 배열과 `constants`의 `TOOL_DEFAULT_ENABLED`에 함께 등재한다

### Ask first

- 레지스트리 순서·게이트 규칙 변경

### Never do

- 비활성 도구를 등록한다

## Dependencies

- 내부: `../tools`(도구 정의 import), `config`의 `EnableFlags`(게이트 입력)
- 외부: `@modelcontextprotocol/sdk`(`McpServer` 타입)
- 소비처: `mcp`, root
