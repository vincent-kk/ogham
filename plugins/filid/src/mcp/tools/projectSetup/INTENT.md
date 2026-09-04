# projectSetup — setup action dispatcher

## Purpose

Filid 프로젝트 초기화, managed rule 문서 확인·동기화, bounded 설정 세션을 `project_setup`의 명시적 action으로 라우팅한다.

## Conventions

- `action`은 정확히 한 child entry point 또는 handler를 선택한다.
- 기존 setup 결과의 summary, data, diagnostics 의미를 바꾸지 않는다.
- project root 정규화와 abort signal 전달은 action 경계에서 한 번만 수행한다.

## Boundaries

### Always do

- child fractal은 각 named entry point를 통해서만 호출
- rule action은 canonical `RULE_DOC_ACTIONS` 값으로 변환
- 설정 세션에는 host abort signal 전달

### Ask first

- action 집합, setup payload 또는 root 기본값 변경

### Never do

- child 구현 파일 직접 import
- 설정 UI 밖에서 interactive config 저장 흐름 재구현
- 초기화 action에서 managed rule 문서 배포
