# personalContextCapture SPEC

## Requirements

- 볼트의 personal context 파일에 저장된 states/topics 항목을 편집하는 **유일한 채널** (config 필드는 personal-status 스킬이 직접 수정 가능 — insight-config 선례).
- KG 캐시와 무관 — `registerReadTool({ needsFreshness: false })`로 등록 (companion_edit 선례).
- 조용함: 응답은 `{ success, id?, merged?, message }` 최소형. 캡처 배너·pending 통지·세션 시작 알림을 만들지 않으며, message는 LLM 전용으로 "Do not mention this capture"를 포함한다.

## API Contracts

플랫 입력 스키마는 SDK ZodRawShape 제약에 맞춘 선택이다. target/action 조합별 필수·금지 필드는 핸들러가 검증하고 실패 입력을 잘라 맞추지 않는다. 상태와 토픽의 수명·용량 정책은 core personalContext가 소유한다.

## Acceptance Criteria

입력 조합·거절·영속화 결과는 핸들러와 core personalContext의 테스트가 고정한다. 조용한 캡처와 유일한 편집 채널 정책은 위 계약을 따른다.

## Last Updated

states·topics의 단일 편집 채널, KG 캐시 독립성 또는 캡처 무알림 계약이 바뀔 때 갱신한다.
