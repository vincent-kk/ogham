## Purpose

설정용 로컬 웹 UI 기동 진입점. Phase 4 는 placeholder 응답만 반환; Phase 5 에서 실제 HTTP 서버 + token 검증 + 5 분 idle 종료를 추가.

## Structure

| File         | Role                                                                  |
| ------------ | --------------------------------------------------------------------- |
| `handler.ts` | `handleOpenSettings` — Phase 4 placeholder (`url=''`, `reused=false`) |
| `index.ts`   | barrel                                                                |

## Conventions

- Phase 4 단계에서는 web server 를 띄우지 않음 — 단순 응답만
- 응답 스키마는 `{ url, message, reused }` 로 유지 (Phase 5 호환)
- 입력 스키마는 `z.object({})` (현재 인자 없음)

## Boundaries

### Always do

- Phase 4 응답 메시지에 "Phase 5" 안내 문구 포함 (호출자가 인지)
- Phase 5 도입 시 INTENT.md 의 placeholder 표시 제거

### Ask first

- 응답 스키마 변경 (Phase 5 와의 호환성)

### Never do

- Phase 4 단계에서 HTTP 서버 기동 (Phase 5 범위)
- token 발급·검증 로직 추가 (Phase 5 범위)
