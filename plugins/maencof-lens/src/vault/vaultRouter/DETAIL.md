# vaultRouter — Contract

## Requirements

- 볼트 이름을 설정 항목으로 바꾸는 일만 한다. 경로 존재 확인·그래프 로드·파일 읽기는 하지 않는다 — 의존이 `config/configSchema` 의 타입뿐이라 파일시스템에 닿을 수단이 없다.
- 기본 볼트는 생성 시 한 번 정해진다: `default: true` 인 **첫** 항목, 없으면 목록의 첫 항목. 설정이 바뀌면 라우터를 새로 만든다(두 필드 모두 `readonly`).
- 이름을 생략한 호출은 기본 볼트로 간다.
- 모르는 이름은 조용히 기본 볼트로 떨어지지 않는다. 등록된 이름 목록을 담아 throw 한다 — 오타가 엉뚱한 볼트를 읽는 것이 실패보다 나쁘다.
- 볼트별 `layers` 를 해석하거나 적용하지 않는다. 반환된 `VaultConfig.layers` 가 상한 값이고, 그 적용은 `filter/layerGuard` 가 소유한다.
- 빈 목록을 방어하지 않는다. `LensConfigSchema` 가 `vaults` 최소 1개를 보장하므로 검증된 config 만 생성자에 들어온다.
- 반환하는 `VaultConfig` 는 설정 객체 그대로다. 복사·정규화하지 않으므로 호출자는 이를 읽기 전용으로 다룬다.

## API Contracts

- `new VaultRouter(config: LensConfig)` — 검증·정규화를 마친 config 를 받는다. 생성 시 기본 볼트를 확정한다.
- `resolve(vaultName?: string): VaultConfig` — 이름 미지정이면 기본 볼트. 등록된 이름이면 그 항목. 미등록 이름이면 `Unknown vault: "<name>". Available: <등록된 이름들>` 로 throw 한다.
- `getDefault(): VaultConfig` — 생성 시 확정된 기본 볼트.
- `listVaults(): VaultConfig[]` — 설정에 적힌 순서 그대로의 전체 목록.

## Acceptance Criteria

### AC-default-selection — 기본 볼트 결정

- `default: true` 인 항목이 있으면 그것이 기본 볼트가 된다.
- 그런 항목이 없으면 목록의 첫 항목이 기본 볼트가 된다.
- `resolve()` 를 인자 없이 부르면 `getDefault()` 와 같은 항목이 나온다.

### AC-unknown-vault-throws — 미등록 이름 거부

- 등록되지 않은 이름으로 `resolve` 하면 throw 한다.
- 그 에러 메시지에 등록된 볼트 이름들이 들어 있다.
- 미등록 이름이 기본 볼트로 대체되지 않는다.

### AC-no-filesystem-access — 파일시스템 비접촉

- 생성과 해석 어느 경로에서도 볼트 경로를 읽거나 쓰지 않는다.
- 존재하지 않는 경로가 설정에 있어도 해석 자체는 성공한다.

## Last Updated

2026-07-30 — 기본 볼트 결정과 미등록 이름 거부 계약을 문서화했다.
