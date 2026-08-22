# gates — 작업 게이트 원장 표면

## Purpose

작업 원장의 상태 조회·포기·수동 증거 기록만 제공한다. 실행 가능한 검사의 명령과 증거 기록 권한은 이 도구 밖에 둔다.

## Conventions

- `status` 는 원장을 읽고, `abandon` 과 `record` 는 기존 원장만 갱신한다.
- `record` 는 CHECK 없는 수동 게이트에만 허용하고, CHECK 게이트는 Bash 실행 뒤 출력의 EXPECT 매치로만 증명한다.
- 작업 이름은 소문자 kebab-case 패턴으로 검증해 경로 이탈을 막는다.
- 도구 참조는 full-form `mcp__plugin_seiri_tools__gates` 를 쓴다.

## Boundaries

### Always do

- 오류를 throw 해 서버의 공통 직렬화 경계가 모델에게 전달하게 할 것.
- 포기에는 사유를, 수동 기록에는 관측한 증거를 요구할 것.
- CHECK가 있지만 EXPECT가 없는 미충족 게이트는 `needs_expect: true`로 수리 필요를 드러낼 것.

### Ask first

- 액션이나 반환 상태 계약 확장.

### Never do

- 프로세스를 띄우거나 모델이 작성한 명령을 실행.
- 원장을 생성·삭제하거나 `session_id` 를 읽고 쓰기.
- 세션 훅에서 호출되는 설계 또는 규칙 파일 접근.
