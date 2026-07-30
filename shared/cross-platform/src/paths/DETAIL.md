# paths — Contract

## Requirements

- OS 별 config·cache 위치는 `env-paths` 에 위임한다. 여기서 플랫폼 분기를 다시 만들지 않는다.
- 호스트 좌표는 `hostRegistry` 의 테이블에서 읽는다. 이 모듈이 호스트 목록을 중복 선언하지 않는다.
- 사용자 상태 루트는 해당 호스트의 relocation env 를 먼저 본다.
- containment 는 입력 단계에서 절대 세그먼트와 모든 `..` 구성요소를 거부하고, 결과가 루트의 descendant 인지 다시 확인한다. 상대 프로젝트 루트나 루트 밖 결과를 반환하지 않는다.
- aggregate 진입점과 목적별 subpath 진입점은 같은 입력에 같은 결과를 낸다 — 소비자가 어느 쪽을 쓰든 좌표가 갈리지 않아야 한다.

## API Contracts

- `index.ts`·`paths.ts` — aggregate API(home·tmp·config·cache 등).
- `state/` organ — 호스트 상태 루트와 plugin cache 좌표. 서브패스 `paths/state-root`·`paths/plugin-cache` 로 노출된다.
- `operations/` organ — normalize·containment. 서브패스 `paths/normalize`·`paths/contained` 로 노출된다.
- `compat/` 하위 fractal — portable 경로 연산.

## Acceptance Criteria

### AC-containment-rejects-escape — 탈출 거부

- 절대 세그먼트나 `..` 를 담은 입력이 거부되고, 결과가 루트 밖이면 반환되지 않는다.

### AC-entry-parity — 진입점 동등성

- aggregate 와 목적별 subpath 가 같은 좌표를 낸다.

## Boundary Exemptions

### `state` — Lean single-purpose entry

- **Consumers**: `**/src/hooks/**`, `**/src/configScope/**`
- **Direct import**: `allowed`
- **Reason**: 이 패키지의 `exports` 맵은 `paths/plugin-cache`·`paths/state-root` 처럼 concrete 파일을 서브패스로 노출한다. 훅 도달 코드는 크기 가드를 받으므로 필요한 한 함수만 가져가야 하고, `paths` 배럴을 거치면 `env-paths` 를 포함한 aggregate 그래프 전체가 번들에 끌려 들어온다. `INTENT.md` 의 "hook 은 필요한 단일 목적 subpath 만 import 한다" 가 같은 계약을 이미 선언한다.

## Last Updated

2026-07-30 — containment·진입점 동등성 계약과 훅용 lean 진입 면책을 문서화했다.
