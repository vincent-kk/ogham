# core — Contract

## Requirements

- 통계 의미·기법 적합성·MCP 프로토콜을 모르는 실행 기반이다. 실행 안전이 정책 판정에 결합되지 않게 한다.
- 하위 실행 모듈은 서로의 배럴을 통과한다. 이 배럴은 공개 이름만 재노출하고 내부 구현을 노출하지 않는다.

## API Contracts

- 배럴은 하위 실행 경계의 의미를 바꾸지 않고 조립만 한다. 실행·격리·게이트·잡의 구체 계약은 각 소유 모듈에서 읽는다.

## Acceptance Criteria

### AC-core-domain-ignorance — 도메인 무지

- core 아래 어떤 파일도 통계 기법 이름이나 가정 판정 로직을 담지 않는다.
- core 는 `mcp/` 의 심볼을 import 하지 않는다 — 의존 방향은 `mcp → core` 한 방향이다.

### AC-core-barrel-surface — 배럴 표면

- `core/index.ts` 의 재노출은 전부 named export 이며 네 하위 배럴만을 원천으로 한다.
- 하위 fractal 간 직접 import(다른 fractal의 내부 연산 파일 참조)가 0건이다.

## Last Updated

실행 안전의 소유권과 하위 모듈 공개 경계의 내용이나 적용 범위가 바뀔 때 갱신한다.
