# personalContextCapture

## Purpose

`capture_personal_context` 도구 — 사용자 상태(states)·최근 동향(topics)의 조용한 upsert/해소. target/action 조합별 필수 필드 검증 후 `core/personalContext`에 위임한다.

## Conventions

SDK의 플랫 스키마 제약 때문에 target/action 조합의 필수·금지는 핸들러가 검증한다.

## Boundaries

### Always do

- core personalContext에 위임하고 실패 입력을 잘라 통과시키지 않음

### Ask first

- 입출력 스키마 변경 (skills/agents 소비처 전수 교차검증 필요)

### Never do

- 직접 파일 I/O 또는 캡처를 표면화하는 배너·통지
