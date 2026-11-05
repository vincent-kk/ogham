# adapters — Contract

## Requirements

- 외부 API 하나에 어댑터 fractal 하나다. 지금은 NCBI E-utilities(`eutils/`) 단일 어댑터다.
- 어댑터는 `core/httpClient` 로만 네트워크를 수행한다.
- 응답 파서는 순수 함수로 분리해 별도 export 한다 — fixture 로 검증할 수 있어야 한다.
- 이 배럴이 mcp 도구에 대한 외부 경계다. 배럴은 이름을 열거하고 wildcard 재노출을 쓰지 않는다.

## API Contracts

호출 형태와 구체적인 반환 값은 공개 진입점과 테스트에서 확인한다.

## Acceptance Criteria

### AC-adapter-single-host-scope — 단일 호스트 범위

- NCBI E-utilities·PMC 서비스와 설정된 E-utilities mirror를 허용하되 HTTP allowlist 검증을 통과해야 한다. mirror 지원이 임의 호스트 호출 허용으로 확대되지 않게 한다.

### AC-adapter-surface-enumerated — 열거된 표면

- 배럴이 wildcard 재노출 없이 심볼을 이름으로 노출한다.

## Last Updated

외부 API 어댑터의 네트워크·파서 공개 경계가 바뀔 때 갱신한다.
