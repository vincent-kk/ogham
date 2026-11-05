# mcp — Contract

## Requirements

- 이 계층에서 나가는 것은 도구 스키마가 아니라 **상태의 렌더**다 — 어떤 규칙이 배포됐고 다이얼이 어디 있는지.
- 등록된 도구는 settings, gates, runtime 세 개다. runtime은 호스트가 제공하지 않는 명시적 조건부 참여·단계·다이얼 밸브 계약이다.
- 코드에 대해서는 아무것도 하지 않는다 — 읽기·검색·분석은 하니스가 이미 제공한다.
- 복잡성은 코드 안에 격리하고 컨텍스트로 내보내지 않는다.

## API Contracts

settings는 설정, gates는 작업 증거, runtime은 참여·단계·밸브를 소유한다. accepted는 입력 수락이며 hook ACK를 대신하지 않는다.

## Acceptance Criteria

### AC-tool-surface-fixed — 고정된 표면

- 등록 도구가 정확히 3개다. 참여 액션은 입력만 검증하며 호스트 세션을 추측하거나 상태를 직접 활성화하지 않는다. `dial`은 gitignore된 런타임 밸브 파일(`RUNTIME_FILE`)만 쓴다.

### AC-mcp-no-code-tools — 코드 도구 부재

- 어떤 도구도 파일 읽기·검색·분석 기능을 노출하지 않는다.

## Last Updated

MCP 표면과 호스트 경계 계약의 내용과 근거가 바뀔 때 갱신한다.
