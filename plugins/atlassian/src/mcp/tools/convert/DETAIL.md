# convert — Contract

## Requirements

- 완전히 로컬에서 실행된다. HTTP 통신도, 인증도, 설정 로드도 없다.
- 변환 자체는 `converter/` 에 위임한다 — 이 핸들러는 포맷 쌍을 골라 넘기고 봉투를 씌우는 일만 한다.
- 지원하지 않는 포맷 쌍은 조용히 통과시키지 않고 오류로 답한다.

## API Contracts

- `handleConvert(...)` — 입력 텍스트와 포맷 쌍을 받아 변환 결과를 표준 봉투로 돌려준다.

## Acceptance Criteria

### AC-local-only — 로컬 전용

- 이 fractal 에 HTTP·인증·설정 참조가 없다.

### AC-format-pair — 포맷 쌍 처리

- 지원 포맷 쌍이 대응 변환기로 위임된다.
- 미지원 조합이 오류로 보고된다.

## Last Updated

2026-07-30 — 로컬 변환 도구 계약을 문서화했다.
