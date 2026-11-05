# vaultRedirector — Contract

## Requirements

- `isMaencofVault` 게이트를 먼저 통과한다.
- 내부 경로 판정은 `MAENCOF_DIR`·`META_DIR` 기반 `INTERNAL_DIRS` 로 한다. 문자열 비교를 흩어 두지 않는다.
- 내부 캐시·메타데이터를 문서 도구의 대상으로 안내하지 않는다. 직접 편집은 상태를 손상시킬 수 있지만, 읽기 안내 관심사가 쓰기 권한 집행까지 맡지는 않는다.

## API Contracts

문서 읽기에는 MCP 대안을 안내하되 실행을 차단하지 않는다. 내부 관리 경로는 안내에서 제외해 캐시·상태를 지식 문서처럼 다루지 않게 한다. 최종 stdout 표현은 상위 디스패처에 맡긴다.

## Acceptance Criteria

### AC-internal-path-blocked — 내부 상태의 문서 안내 제외

- 내부 캐시·메타데이터 경로에는 문서 도구 안내나 차단 신호를 추가하지 않는다.

### AC-doc-tree-allowed — 문서 트리 허용

- 5-Layer 문서 경로는 통과한다.

### AC-no-bypass — 안내 경계 일관성

- 파일 경로와 Glob 검색 디렉터리 모두 내부 관리 경로를 문서 안내에서 제외한다.

## Boundary Exemptions

### `operations` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. PreToolUse orchestrator 가 필요한 연산 하나만 직접 가져오며, 그 번들의 캡은 12288 바이트라 배럴이 세 연산과 타입을 함께 끌고 올 여유가 없다.

## Last Updated

내부 관리 경로의 안내 제외 또는 문서 읽기의 비차단 안내 경계가 바뀔 때 갱신한다.
