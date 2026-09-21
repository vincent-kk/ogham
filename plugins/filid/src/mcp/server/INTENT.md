# server — 4-tool MCP assembly

## Purpose

Filid 1.0의 4개 action-dispatched 도구를 등록하고 공통 artifact envelope, stdio transport와 cache lifecycle을 조립한다.

## Conventions

- SDK에 등록하는 스키마는 `deferInputValidation`으로 감싼다. SDK 단계에서 입력을 거르면 조건부 제약 위반이 transport 오류가 되어 호출자가 `nextAction`을 받지 못한다. 검증의 정본은 handler 경계의 원본 Zod 스키마다.
- 입력 오류와 실행 오류는 서로 다른 diagnostic code로 나뉜다. 한 catch로 합치면 호출자가 자기 인자 문제인지 엔진 결함인지 구별할 수 없다.
- inline 예산을 넘는 payload는 artifact로 내보내고 inline에는 summary만 남긴다. `restructure`의 `plan`은 크기와 무관하게 항상 artifact를 남긴다.
- boot sweep와 shutdown cleanup은 best-effort다. 실패해도 서버를 멈추지 않으며, project root가 해석되지 않으면 project-scoped 작업을 건너뛴다.

## Structure

- 도구 registry 조립과 process lifecycle은 `lifecycle/` 하나가 소유하고, 나머지 organ은 envelope·오류 경계와 입력 검증 지연만 맡는다.
- 이름 함정: executable entry는 이 디렉터리의 배럴이 아니라 형제 fractal serverEntry다.

## Boundaries

### Always do

- 모든 handler를 schema validation과 envelope 경계로 감싸기
- tool 이름과 등록 수를 integration test로 고정
- shutdown handler는 한 번만 등록하고 동기 cleanup만 수행

### Ask first

- 4-tool registry, action schema, envelope budget 또는 lifecycle 정책 변경
- 새로운 persistent state 도입

### Never do

- core FCA 판단이나 생태계 parsing 인라인
- 큰 data를 envelope 밖에서 raw 반환
- root 미해석 시 plugin cwd를 project로 간주
- shutdown 경로에 async I/O나 모델 호출 추가

## Dependencies

- envelope 예산을 넘는 payload는 project tree 밖 plugin cache에 쓴다. 그래서 이 fractal은 host의 cache 경로 해석에 묶이고, root가 해석되지 않는 실행에서는 그 경로가 없다는 전제로 동작해야 한다.
