# adapters — Contract

## Requirements

- 외부 API 하나에 어댑터 fractal 하나다. 지금은 NCBI E-utilities(`eutils/`) 단일 어댑터다.
- 어댑터는 `core/httpClient` 로만 네트워크를 수행한다.
- 응답 파서는 순수 함수로 분리해 별도 export 한다 — fixture 로 검증할 수 있어야 한다.
- 이 배럴이 mcp 도구에 대한 외부 경계다. 배럴은 이름을 열거하고 wildcard 재노출을 쓰지 않는다.

## API Contracts

- 호출 함수: `esearch`, `efetch`, `esummary`, `espell`, `elink`, `idconv`, `oaService`
- 순수 파서: `parseEsearch`, `parseEfetch`, `parseEsummary`, `parseEspell`, `parseElink`, `parseIdConv`, `parseOa`
- 인자 타입: `EsearchArgs`, `EfetchArgs`, `EsummaryArgs`, `EspellArgs`, `ElinkArgs`, `IdConvArgs`, `OaArgs`

## Acceptance Criteria

### AC-adapter-single-host-scope — 단일 호스트 범위

- 어댑터가 NCBI eutils 와 PMC utils 밖의 호스트를 호출하지 않는다.

### AC-adapter-surface-enumerated — 열거된 표면

- 배럴이 wildcard 재노출 없이 심볼을 이름으로 노출한다.

## Last Updated

2026-07-30 — 어댑터 계층 경계를 문서화하고 배럴 표면을 열거형으로 고정했다.
