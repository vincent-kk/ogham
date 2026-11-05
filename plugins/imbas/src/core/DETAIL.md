# core — Contract

## Requirements

- 프로젝트의 imbas 작업 디렉터리 아래의 상태·설정·매니페스트를 소유하는 비즈니스 로직 계층이다. MCP 도구 핸들러는 전송 입력 해독·공유 스키마 검증·저장을 조립할 수 있지만, 상태 전이·요약 계산·실행 경로 정책을 재구현하지 않아 도메인 판단이 갈라지는 것을 막는다.
- 상태·매니페스트 JSON은 lib/fileIo의 원자적 쓰기를, 설정 계층은 cross-platform의 원자적 계층 쓰기를 경유한다. 직접 파일 덮어쓰기는 중단 시 반쯤 쓰인 문서를 남기므로 금지한다. 실행 ID 발급을 위한 디렉터리 생성·조회는 이 파일 쓰기 규칙의 대상이 아니다.
- provider API(Jira·GitHub) 호출은 이 계층의 몫이 아니다. core 는 파일과 스키마만 다루고, 트래커 실행은 스킬 계층이 수행한다.
- Zod 스키마는 `types/` 가 단독 소유한다. core 는 스키마를 정의하지 않고 참조만 한다.

## API Contracts

- 배럴은 이름을 하나씩 적는다. 와일드카드는 하위 모듈의 추가를 조용히 공개 계약으로 승격시킨다.
- 계층별 설정을 다루는 소비자는 configManager의 진입점에 직접 닿는다. 부모의 일반 설정 표면으로 계층 편집 계약을 넓히지 않는다.
- 상태 전이 헬퍼는 stateManager 전용이며 공개 배럴로 나가지 않는다.

## Acceptance Criteria

### AC-core-barrel-named — 배럴 명시 재노출

- `core/index.ts` 에 `export *` 형태가 없다.
- 배럴은 하위 모듈의 의도된 공개 표면만 노출한다.

### AC-core-atomic-write — 원자적 파일 쓰기

- `core/**` 에 `fs.writeFileSync` · `fs.promises.writeFile` 직접 호출이 없다.

### AC-core-no-tracker-io — 트래커 I/O 부재

- `core/**` 가 네트워크 클라이언트나 `gh` · `jira` CLI 를 호출하지 않는다.

### AC-core-utils-internal — utils organ 비공개

- `core/utils/` 의 심볼이 `core/index.ts` 를 통해 노출되지 않는다.
- `core/utils/` 를 `core/` 바깥에서 직접 import 하는 파일이 없다.

## Last Updated

상태 소유권과 공통 경계 계약의 내용과 근거가 바뀔 때 갱신한다.
