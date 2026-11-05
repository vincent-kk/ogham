# userPromptSubmit -- UserPromptSubmit 훅

## Purpose

사용자 프롬프트마다 turn-scoped fmap을 초기화하고 전달 TTL turn을 증가시킨 뒤, 세션 첫 프롬프트에만 FCA-AI 포인터·언어 태그·비활성 규칙 목록을 주입한다.

## Structure

- `userPromptSubmit.entry.ts`가 stdin/stdout host 진입점이고 `userPromptSubmit.ts`는 handler 구현이다. 유사한 이름이 공개 진입점을 혼동시킬 수 있어 둘을 구분한다.

## Conventions

- 비-FCA 프로젝트에는 개입하지 않는다. map·turn 갱신은 FCA 방문 전달의 수명만 소유한다.
- 세션 최초 context는 규칙 포인터와 언어 태그, 필요한 비활성 규칙 요약으로 제한한다. 본문을 복제하면 프롬프트마다 같은 규칙이 누적된다.
- branch·spike·harvest 상태는 prompt context의 입력이 아니다.

## Boundaries

### Always do

- 규칙 본문을 복제하지 않고 경로만 포인터로 제공
- fmap reset은 FCA 프로젝트에서만 수행
- host rule target에는 절대 write 금지 (`setup` 스킬 전담)

### Ask first

- fmap·turn 외 추가 상태 리셋/증가 (boundary·delivered 캐시 등 — delivered는 setup의 epoch 리셋 전담)
- 포인터 이외 추가 컨텍스트 라인
- 포인터 주입 Gate 완화 또는 매 프롬프트 재주입

### Never do

- 검사한 host rule target에 파일 write
- `continue: false` 반환
- branch·spike·harvest 배너 주입
- 훅 번들에 zod import (번들 크기 예산 초과 — `readHookConfig` 패턴 사용)
- 번들 출력에 범용 manager·planning·apply·transaction 코드 포함
