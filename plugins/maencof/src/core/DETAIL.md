# Core Contract

## Requirements

- 지식 그래프의 파싱, 구축, 검색 보조 연산은 각 하위 fractal이 소유하고, 이 경계는 외부 소비자가 쓰는 core 표면을 조합한다.
- MCP와 훅 구현에 의존하지 않는다. vault I/O가 필요한 연산은 해당 하위 fractal 경계에서 끝나며, 상위 계층의 서버나 훅 수명주기를 끌어오지 않는다.

## API Contracts

- `index.ts`는 하위 fractal의 공개 진입점에서 필요한 이름만 재노출한다. 내부 구현 파일은 이 경계를 우회해 외부 소비자에게 공개하지 않는다.
- 상위 `src` 진입점은 필요한 core 심볼을 이 경계에서 가져간다. 새로운 core 심볼은 실제 소비자와 계약이 있을 때만 공개한다.

## Acceptance Criteria

### AC-core-dependency-direction — Core dependency direction

- core 모듈은 MCP 서버와 훅 구현을 import하지 않는다.
- 외부 소비자는 core 하위 구현 대신 해당 공개 진입점을 사용한다.

### AC-core-public-surface — Explicit core surface

- core 진입점의 재노출은 이름으로 열거되며, 내부 파일의 새 심볼이 공개 표면을 자동으로 넓히지 않는다.

## Last Updated

2026-09-26
