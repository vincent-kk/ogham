# configProvisioner — Contract

## Requirements

- 기존 사용자 값과 중첩 객체는 보존한다. 버전이 낮은 설정에는 누락된 최상위 키와 관리용 스키마 버전만 보충한다 — 새 기본값 도입이 사용자 선택을 되돌리면 안 된다.
- 만들 대상과 기본값은 `CONFIG_REGISTRY` 에서만 가져온다. 여기에 리터럴 기본값을 두지 않는다.
- 생성 대상은 볼트의 메타데이터 디렉터리 하위다.

## API Contracts

프로비저닝은 사용자 설정값을 되돌리지 않아야 한다. 생성 대상과 기본값은 레지스트리 한 곳에서만 가져온다.

## Acceptance Criteria

### AC-no-overwrite — 사용자 값 덮어쓰기 금지

- 마이그레이션은 기존 사용자 키의 값을 보존한다. 최신 버전·버전 관리 대상 밖·손상된 설정은 다시 쓰지 않는다.

### AC-registry-driven — 레지스트리 기반

- 생성되는 파일 집합과 기본값이 레지스트리와 일치한다.

## Boundary Exemptions

### `configProvisioner.ts` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. SessionStart 훅이 프로비저닝을 호출하는데, 배럴을 거치면 재노출 그래프가 번들에 끌려 들어와 가드를 넘긴다.

## Last Updated

기존 설정 보존, 레지스트리 기반 생성 또는 메타 디렉터리의 프로비저닝 범위가 바뀔 때 갱신한다.
