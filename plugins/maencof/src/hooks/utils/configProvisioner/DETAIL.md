# configProvisioner — Contract

## Requirements

- 기존 설정 파일을 덮어쓰지 않는다. 누락된 것만 만든다 — 사용자가 고친 값을 프로비저닝이 되돌리면 안 된다.
- 만들 대상과 기본값은 `CONFIG_REGISTRY` 에서만 가져온다. 여기에 리터럴 기본값을 두지 않는다.
- 대상 경로는 `.maencof-meta/` 하위다.

## API Contracts

- `provisionMissingConfigs(cwd)` — 레지스트리 항목 중 파일이 없는 것만 기본값으로 생성하고 `ProvisionResult` 를 반환한다. 기존 파일은 건드리지 않는다.

## Acceptance Criteria

### AC-no-overwrite — 덮어쓰기 금지

- 이미 있는 설정 파일의 내용이 프로비저닝 뒤에도 같다.

### AC-registry-driven — 레지스트리 기반

- 생성되는 파일 집합과 기본값이 레지스트리와 일치한다.

## Boundary Exemptions

### `configProvisioner.ts` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. SessionStart 훅이 프로비저닝을 호출하는데, 배럴을 거치면 재노출 그래프가 번들에 끌려 들어와 가드를 넘긴다.

## Last Updated

2026-07-30 — 덮어쓰기 금지·레지스트리 기반 계약과 훅 직접 import 면책을 문서화했다.
