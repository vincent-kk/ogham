## Purpose

절대 프로젝트 루트에 한정된 artifact manager를 제공한다. 프로젝트 scope를
선택한 호출만 저장소의 규칙, 지침, MCP 구성을 변경할 수 있다.

## Structure

| File         | Role                                       |
| ------------ | ------------------------------------------ |
| `index.ts`   | 프로젝트 공개 계약 배럴                    |
| `project.ts` | host·owner·절대 root를 하위 manager에 결합 |

## Conventions

- `projectRoot`는 생성 시 한 번 절대 경로로 검증한다.
- 명백한 상대 경로 문자열 리터럴은 타입 검사에서도 거부한다.
- 반환 manager는 같은 host·owner·project root를 공유한다.

## Boundaries

### Always do

- 프로젝트 옵션에 `host`, `projectRoot`, `owner`를 모두 요구한다.
- 아티팩트 엔진에는 해석된 프로젝트 target만 전달한다.

### Ask first

- 생성자 시그니처 또는 프로젝트 target 매트릭스 변경.

### Never do

- 상대 프로젝트 루트를 수용하거나 사용자 상태 루트에 쓰기.
- 다른 프랙탈의 내부 구현 파일 import.

## Dependencies

- `rules`, `instructions`, `mcp`, `targets`, `transactions`.
