# hostRegistry — Contract

## Requirements

- 내부 의존이 없는 leaf 로 유지한다. 다른 내부 모듈을 import 하지 않고, 파일 I/O 도 `process` 직접 판독도 하지 않는다.
- 새 호스트는 조건문이 아니라 `HOSTS` 행으로 추가한다. 호스트 이름과 host-specific env 이름은 이 모듈이 선언한다.
- marker 가 있으면 훅 신호보다 우선한다. 미인식 marker 는 `unknown` 이다.
- 신호가 전혀 없으면 Claude, 서로 다른 훅 신호가 겹치면 `unknown` 이다. 미인식 호스트를 명시적 Claude 결과로 반환하지 않는다.
- 테이블에는 실측된 값만 둔다. agy 의 Claude 상태 채널 차용은 추론이 아니라 명시적 행으로 남긴다.

## API Contracts

- `HOSTS` — 호스트 행과 marker env 의 순수 데이터.
- `Host` · `KnownHost` · descriptor 타입.
- `hostFromMarker(env)` — MCP marker 판별.
- `runtime/` organ — marker·훅 신호에서 명시적 host ID 판별. 서브패스 `host-registry/runtime` 으로 노출된다.
- `resolveHostDescriptor(...)` — 기존 상태 경로 호환용 descriptor 판별. 서브패스 `host-registry/descriptor` 로 노출된다.

## Acceptance Criteria

### AC-marker-precedence — marker 우선

- marker 가 있으면 훅 신호와 무관하게 marker 결과가 이긴다.

### AC-unknown-not-claude — unknown 보존

- 미인식 marker 나 겹치는 훅 신호가 `unknown` 으로 남고 Claude 로 낮춰지지 않는다.

### AC-leaf-no-internal-deps — leaf 유지

- 이 fractal 이 다른 내부 모듈을 import 하지 않는다.

## Boundary Exemptions

### `operations` — Lean single-purpose entry

- **Consumers**: `**/src/paths/state/**`
- **Direct import**: `allowed`
- **Reason**: `paths/state` 의 파일들은 `paths/state-root`·`paths/plugin-cache` 서브패스로 직접 노출되고, 그 그래프는 cennad `injectStatic`·`injectDynamic` 훅 번들에 실려 크기·모듈 가드를 받는다. `hostRegistry` 배럴을 거치면 runtime 판별과 marker 판별 그래프까지 함께 끌려 들어와 `build:plugin` 의 hook bundle isolation 가드가 실패한다 — 배럴 경유는 선택지가 아니라 빌드 실패다. 대상은 `registry.ts`(`host-registry/hosts`)와 `resolveHostDescriptor.ts`(`host-registry/descriptor`)이며 둘 다 자기 서브패스로도 직접 노출된다. `INTENT.md` 의 "hook 은 목적별 단일 entry 를 사용한다" 가 같은 계약을 이미 선언한다.

## Last Updated

2026-07-30 — marker 우선·leaf 계약과 lean 진입 면책을 문서화했다.
