# mcp contract

## Requirements

- 언어 중립 core를 정확히 9개 MCP 도구로 노출한다.
- 이 계층은 입력 검증, artifact envelope와 host lifecycle만 소유한다. 정책 판단과 FCA 결론은 core가 낸다.
- 모든 도구 반환은 공통 envelope와 16 KiB inline 예산을 따른다.
- `pages/`는 브라우저 자산, `server/`는 프로토콜 경계, `tools/`는 도구 sub-fractal, `serverEntry/`는 번들 진입점이다.

## API Contracts

- 진입점은 9개 `handle*` 함수와 서버 기동 API를 이름으로 재수출한다.
- 도구 sub-fractal 사이의 직접 import는 없다.

## Acceptance Criteria

### AC-mcp-surface — 아홉 개 도구

- 진입점이 노출하는 도구 handler가 정확히 9개이며 제거된 도구가 없다.

### AC-mcp-no-policy — 판단은 core가 한다

- MCP 계층이 FCA 판정을 자체 계산하지 않고 core 결과를 전달한다.

## Last Updated

2026-07-28 — 중간 계층 fractal 계약을 문서화했다.
