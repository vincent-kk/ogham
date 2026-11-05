# mcp contract

## Requirements

- 언어 중립 core를 action-dispatched MCP 도구로 노출한다.
- 이 계층은 입력 검증, artifact envelope와 host lifecycle만 소유한다. 정책 판단과 FCA 결론은 core가 낸다.
- 모든 도구 반환은 공통 envelope와 16 KiB inline 예산을 따른다.

## API Contracts

- 진입점은 `createServer`와 `startServer`만 이름으로 재수출한다. 도구는 `createServer` 내부에서 등록된다.
- 도구 sub-fractal 사이의 직접 import는 없다.

## Acceptance Criteria

### AC-mcp-surface — 진입점 표면

- 진입점은 `createServer`와 `startServer`만 노출하며, 도구 등록은 `createServer`가 한다.

### AC-mcp-no-policy — 판단은 core가 한다

- MCP 계층이 FCA 판정을 자체 계산하지 않고 core 결과를 전달한다.

## Last Updated

host와 core의 책임 분리, 입력 검증이나 공통 envelope 예산이 바뀔 때 갱신한다.
