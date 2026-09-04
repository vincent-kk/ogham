# tools — MCP 도구 2개

## Purpose

seiri 가 노출하는 도구 전부. 둘 모두 **상태를 읽고 쓰는 최소**이며, 코드에 대해서는 아무것도 하지 않는다 — 읽기·검색·분석은 하니스가 이미 제공한다.

## Structure

`settings` 는 설정 페이지와 헤드리스 폴백을 하나의 `action` 계약으로 제공하고, `gates` 는 작업 원장 상태를 맡는다. 두 도구는 서로 다른 상태기계를 소유한다.

## Conventions

- `settings` 의 브라우저와 헤드리스 경로는 같은 core 함수(`planRuleDocs`·`applyRuleDocs`)를 경유한다. 진입 방식이 달라도 판정은 하나다.
- **absorb-first**: 새 설정 요구는 새 도구가 아니라 `settings` 의 `action` 으로 간다. `config` 가 다이얼 조회·설정을 함께 맡으며, `gates` 는 의미 불일치(설정 ≠ 작업 상태) 때문에 분리한다.
- 다이얼 2계층 중 도구가 쓰는 것은 **런타임 밸브뿐**이다. 기준선은 설정 페이지가 diff 를 보이고 쓴다.
- 프로젝트 대상 입력은 선택 인자로 절대경로를 받는다 — 호스트에 따라 서버가 워크스페이스를 스스로 알 수 없다.
- 도구 참조는 문서·스킬에서 full-form `mcp__plugin_seiri_tools__<name>`.

## Boundaries

### Always do

- 새 기능 요구가 오면 먼저 기존 도구의 판별 값으로 흡수할 수 있는지 볼 것.

### Ask first

- 세 번째 도구 추가.

### Never do

- 코드 검색·분석·편집 도구 추가.
- 세션 훅에서 호출되는 것을 전제한 설계.
