# cacheManager — hook delivery cache

## Purpose

hook의 session, prompt context, boundary, turn-scoped fractal map과 INTENT delivery 상태를 임시 저장한다. criteria, spike, agent 역할과 review verdict는 소유하지 않는다.

## Conventions

- cache는 성능 최적화다. 삭제되어도 다음 요청이 repository 증거에서 상태를 재구성할 수 있어야 한다.
- 방문 판정과 delivery 기록은 `commitVisit` 단일 lock transaction에서 직렬화한다. 병렬 방문이 같은 delivery를 중복 방출하지 않게 막는 유일한 지점이다.
- 모든 I/O는 best-effort다. cache miss와 실패는 안전한 빈 값으로 저하하고 hook·MCP lifecycle을 실패시키지 않는다.
- scope 식별 증거가 없으면 보수적으로 main scope로 저하한다.
- 훅 번들은 배럴 대신 `caches/` 구체 파일을 직접 import한다 (DETAIL.md의 Boundary Exemptions).

## Boundaries

### Always do

- 변경 후 관련 테스트 업데이트
- cache miss와 I/O 실패를 안전한 빈 상태로 저하
- 방문 delivery 판정은 `commitVisit` lock transaction으로 직렬화

### Ask first

- 공개 API 시그니처 변경
- session/subagent scope 식별 방식 변경

### Never do

- 모듈 경계 외부 로직 인라인
- `caches/` organ에 INTENT.md 추가
- criteria, spike, agent 역할 또는 review verdict 상태 저장
