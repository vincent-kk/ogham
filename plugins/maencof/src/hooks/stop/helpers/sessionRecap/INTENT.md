# sessionRecap

## Purpose

Stop 훅에서 세션당 1회, pending insight 캡처(합의 전제 L5 / 잠정 원칙 L2)를 recap으로 Claude에 주입. 발화 지점은 Stop 이다 — SessionEnd 는 표시 보장 채널이 없다.

## Boundaries

### Always do

- cacheManager recap 마커로 세션당 1회 제한 (`hasRecapMarker`/`markRecapEmitted`)
- 캡처가 없으면 침묵 (매 Stop 노이즈 금지)
- `session_recap.enabled=false` off-switch 존중
- 채널은 `hookSpecificOutput.additionalContext` (Stop non-error feedback)

### Ask first

- recap 구성 항목(전제/원칙 매핑) 변경

### Never do

- top-level `message`/`systemMessage` 로 emit (무효·비보장 채널)
- pending 캡처 파일 삭제 (SessionStart 알림 흐름의 소관)
