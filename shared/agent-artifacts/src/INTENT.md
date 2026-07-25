## Purpose

`src/`는 `@ogham/agent-artifacts`의 공개 entry point와 범위·아티팩트별
프랙탈을 묶는다. `index.ts`는 하위 entry point의 공개 심벌만 재수출한다.

## Structure

| Path                | Role                                 |
| ------------------- | ------------------------------------ |
| `index.ts`          | 명시적 루트 배럴                     |
| `project/`, `user/` | 범위가 타입으로 분리된 관리자 생성자 |
| `rules/`            | 규칙 문서 엔진                       |
| `instructions/`     | 지침 구간 엔진                       |
| `mcp/`              | MCP 서버 엔진                        |
| `targets/`          | 물리 대상 해석                       |
| `transactions/`     | revision·lock·apply                  |
| `validation/`       | 범위 생성자 공통 식별자 검증         |
| `types/`            | 공개 타입 organ                      |
| `__tests__/`        | 패키지 아키텍처 검사 organ           |

## Conventions

- 내부 구현은 루트 배럴을 역참조하지 않고 구체적인 sibling entry point를 쓴다.
- 공개 배럴은 wildcard나 default export 없이 심벌을 열거한다.

## Boundaries

### Always do

- 공개 계약 변경 시 루트와 해당 서브패스 배럴을 함께 갱신한다.
- 프로덕션 소스의 시스템 작업은 cross-platform entry point를 사용한다.

### Ask first

- 새 공개 서브패스 또는 루트 재수출 추가.

### Never do

- `index.ts`에 구현 선언 추가 또는 내부 파일 deep import.
- 프로덕션 파일에서 금지된 Node 시스템 모듈 직접 import.

## Dependencies

- `project`, `user`, `rules`, `instructions`, `mcp`, `targets`, `transactions`,
  `validation`.
