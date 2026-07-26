## Purpose

호스트의 사용자 상태 위치에 한정된 artifact manager를 제공한다. 사용자
scope 선택은 모든 프로젝트가 상속할 구성을 변경하려는 명시적 권한 경계다.

## Structure

| File       | Role                                     |
| ---------- | ---------------------------------------- |
| `index.ts` | 사용자 공개 계약 배럴                    |
| `user.ts`  | host·owner를 호스트 사용자 target에 결합 |

## Conventions

- 사용자 root는 host와 환경을 통해 cross-platform에서 해석한다.
- 공개 옵션에는 임의 경로나 프로젝트 루트를 두지 않는다.

## Boundaries

### Always do

- 사용자 옵션을 `host`, `owner`로만 제한한다.
- host별 사용자 target을 `targets` entry point에서 얻는다.

### Ask first

- 생성자 시그니처 또는 사용자 target 매트릭스 변경.

### Never do

- 호출자 지정 출력 경로를 받거나 프로젝트 파일에 쓰기.
- Claude/Codex 외 호스트의 사용자 위치를 추측.

## Dependencies

- `rules`, `instructions`, `mcp`, `targets`, `transactions`.
