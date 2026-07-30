# remindExpiredBuffer

## Purpose

SessionStart 관심사 — L5 buffer 문서 중 TTL(`expires`)이 지난 것을 감지해 정리를 촉구하는 알림을 `additionalContext` 로 주입한다. 아무것도 삭제하지 않는다. L4 의 `archiveExpired`(이동·가역·자동)와 대칭으로, L5 의 비가역 처리는 사용자 판단에 남긴다.

## Structure

- `remindExpiredBuffer.ts` — `runRemindExpiredBuffer` (스캔 + 알림 조립)
- `index.ts` — barrel
- `__tests__/` organ — 검증

## Boundaries

### Always do

- 훅 번들 제약 준수 — Node builtin 과 tree-shake 가능한 `@ogham/cross-platform/paths` 만 사용
- frontmatter 의 `expires` 는 zod 없이 경량 추출
- 볼트가 아니거나 buffer 디렉터리가 없으면 no-op
- 목록은 상한까지만 싣고 나머지는 개수로 접는다

### Ask first

- TTL 판정 기준 변경 (날짜 문자열 비교 → 다른 방식)
- 알림 문구에 담는 경로 개수 상한 변경

### Never do

- 만료 문서 삭제·이동 — 승격이냐 폐기냐는 사용자 판단이고 폐기는 비가역이다
- 자체 볼트 스캔 규칙 신설 (5-Layer 경로 규약을 따른다)
- 알림을 `systemMessage` 등 다른 채널로 이중 발신
