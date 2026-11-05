# vaultRedirector — Contract

## Requirements

- `isMaencofVault` 게이트를 먼저 통과한다.
- 내부 경로 판정은 `MAENCOF_DIR`·`META_DIR` 기반 `INTERNAL_DIRS` 로 한다. 문자열 비교를 흩어 두지 않는다.
- 리디렉션 우회 경로를 만들지 않는다 — `.maencof` 내부는 MCP 도구가 소유하고 직접 편집은 캐시·상태를 깨뜨린다.

## API Contracts

내부 관리 경로의 직접 접근 차단과 5-Layer 문서 경로 허용이 이 문서의 정책이다. 최종 stdout 표현은 상위 디스패처에 맡긴다.

## Acceptance Criteria

### AC-internal-path-blocked — 내부 경로 차단

- `.maencof`·`.maencof-meta` 하위 쓰기 시도가 차단 신호를 받는다.

### AC-doc-tree-allowed — 문서 트리 허용

- 5-Layer 문서 경로는 통과한다.

### AC-no-bypass — 우회 부재

- 리디렉션을 건너뛰는 별도 분기가 없다.

## Boundary Exemptions

### `operations` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. PreToolUse orchestrator 가 필요한 연산 하나만 직접 가져오며, 그 번들의 캡은 12288 바이트라 배럴이 세 연산과 타입을 함께 끌고 올 여유가 없다.

## Last Updated

내부 관리 경로 보호, 문서 트리 허용 또는 리디렉션 우회 금지 경계가 바뀔 때 갱신한다.
