# server — Contract

## Requirements

- 도구 등록은 `registerTool(name, { description, inputSchema, annotations }, wrapHandler(handler))` 형태를 지킨다.
- `inputSchema` 는 `types/` 의 zod 스키마를 재사용한다 — 스키마를 여기서 다시 정의하지 않는다.
- stdio 가 유일한 transport 다.
- 이 fractal 의 외부 소비자는 배럴만 건넌다. `lifecycle/` 은 organ 이다.

## API Contracts

호출 형태와 구체적인 반환 값은 공개 진입점과 테스트에서 확인한다.

## Acceptance Criteria

### AC-server-registration — 등록 규약

- 등록된 각 도구의 콜백이 `wrapHandler` 를 거친다.
- 각 도구의 `inputSchema` 가 `types/` 의 스키마와 동일 객체다.

### AC-server-boundary — 경계 준수

- `lifecycle/` 파일을 이 fractal 밖에서 직접 import 하지 않는다.

## Last Updated

도구 등록·스키마 재사용과 stdio 통신 계약이 바뀔 때 갱신한다.
