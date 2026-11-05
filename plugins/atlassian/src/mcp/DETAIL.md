# mcp — Contract

## Requirements

- 범용 도구는 이슈의 업무 의미나 워크플로를 판정하지 않는다. ADF·Storage·Wiki 표현의 변환과 해당 필드 위치 인식은 허용해 호출자에게 wire 포맷 해석을 떠넘기지 않는다.
- 배포 환경 판별과 API 버전 정책은 core가 공유한다. 스킬과 MCP는 그 결과로 경로·표현 형식을 선택하며, agent와 dispatcher에 환경 분기를 올리지 않는다.
- 범용 도구는 4종이다: `fetch`(HTTP), `convert`(로컬 변환), `auth_check`(인증 상태), `setup`(설정 UI). 여기에 **승인된 도메인 어댑터**를 더할 수 있다 — 현재 `comment_thread` 하나다.
- 도메인 어댑터는 입력 검증, 실행 컨텍스트 구성, 도메인 fractal의 공개 `jira` entry point 호출, 응답 래핑만 수행한다. 도메인 필드 해석, 원격 응답에 따른 레시피 선택, 병합 규칙, 프로필 수명주기는 포함하지 않는다 — 그것은 Jira 도메인 계층이 소유한다.
- 모든 핸들러는 `wrapHandler` 를 거친다.
- 외부 HTTP 는 `httpClient` 만 수행한다 — 핸들러가 `fetch` 를 직접 부르지 않는다.
- 자격증명은 도구 응답에 노출하지 않는다.
- stdout 은 stdio transport 전용이다.

## API Contracts

호출 형태와 구체적인 반환 값은 공개 진입점과 테스트에서 확인한다.

## Acceptance Criteria

### AC-domain-agnostic — 도메인 무지

- 범용 도구와 서버·공유 계층은 표현 형식과 전송 위치만 해석하고, 이슈 필드의 업무 의미·워크플로·병합 규칙을 판정하지 않는다.
- 도메인 어댑터(commentThread)는 공개 `jira` entry point의 named export만 호출하며, 병합·판정 규칙을 담은 함수가 어댑터 안에 없다.

### AC-handler-wrapping — 핸들러 래핑

- 등록 도구가 5개이고 각 핸들러가 `wrapHandler` 를 거친다.

### AC-http-single-path — HTTP 단일 경로

- MCP 계층 안에 `fetch` 직접 호출이 없다.

## Last Updated

범용 도구와 도메인 어댑터의 권한 또는 응답 경계가 바뀔 때 갱신한다.
