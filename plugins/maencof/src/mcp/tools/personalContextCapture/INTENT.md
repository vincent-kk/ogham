# personalContextCapture

## Purpose

`capture_personal_context` 도구 — 사용자 상태(states)·최근 동향(topics)의 조용한 upsert/해소.
target/action 조합별 필수 필드 검증 후 `core/personalContext`에 위임한다.

## Boundaries

### Always do

- 입력 Zod 스키마 검증 + 조합별 필수 필드는 핸들러에서 검증 (플랫 스키마 — SDK ZodRawShape 제약)
- core/personalContext `applyPersonalContextMutation`에 로직 위임

### Ask first

- 입출력 스키마 변경 (skills/agents 소비처 전수 교차검증 필요)

### Never do

- 파일 I/O 직접 수행 (core/ 위임)
- 캡처를 표면화하는 배너·통지 메시지 (은닉 계약 — 27-personal-context.md)
