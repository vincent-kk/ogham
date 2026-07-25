## Purpose

호스트 ID, 마커, 상태 루트 좌표와 훅 판별 신호의 단일 진실원이다.

## Structure

| File                       | Role                                   |
| -------------------------- | -------------------------------------- |
| `index.ts`                 | 공개 배럴                              |
| `types.ts`                 | `Host`, `KnownHost`, descriptor        |
| `registry.ts`              | `HOSTS`와 marker env의 순수 데이터     |
| `hostFromMarker.ts`        | MCP marker 판별                        |
| `runtime/`                 | marker/훅 신호에서 명시적 host ID 판별 |
| `resolveHostDescriptor.ts` | 기존 상태 경로 호환용 descriptor 판별  |

## Conventions

- 내부 의존이 없는 leaf를 유지한다.
- 신호와 상태 좌표는 실측된 값만 테이블에 둔다.
- marker가 있으면 훅 신호보다 우선하며 미인식 marker는 `unknown`이다.
- 신호가 없으면 Claude, 서로 다른 훅 신호가 겹치면 `unknown`이다.
- agy의 Claude 상태 채널 차용은 명시적 테이블 행으로 유지한다.
- hook은 host ID에는 `host-registry/runtime`, 좌표에는
  `host-registry/descriptor`, 비교 상수에는 `host-registry/hosts` 단일 목적
  entry를 사용한다.

## Boundaries

### Always do

- 호스트 이름과 host-specific env 이름은 이 모듈에서 선언한다.
- 새 호스트는 조건문이 아니라 `HOSTS` 행으로 추가한다.

### Ask first

- 새 호스트, 상태 루트, 훅 신호 추가 또는 변경.

### Never do

- 내부 모듈 import, 파일 I/O, `process` 직접 읽기.
- 미인식 호스트를 명시적 Claude 결과로 반환.

## Dependencies

- 내부/외부: 없음.
