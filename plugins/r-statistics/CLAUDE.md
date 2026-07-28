# CLAUDE.md — @ogham/r-statistics

현재 계약은 [INTENT.md](./INTENT.md), 소스 경계는 [src/INTENT.md](./src/INTENT.md), 설계 정본은 [`.metadata/r-statistics/README.md`](../../.metadata/r-statistics/README.md)를 따른다.

## Cross-file contracts

- agent는 방법을 추천할 뿐이며, `assert_analysis_plan`의 결정적 hard gate가 최종 실행 가능 여부를 정한다.
- `src/mcp/tools/assertAnalysisPlan/operations/ruleset.ts`와 `skills/analyze/references/methods/*/meta.yaml`의 기법·가정 매핑을 함께 바꾼다.
- `REQUIRED_PACKAGES`·`PACKAGE_USE_CASES`는 `skills/setup/references/packages.md`, `PACKAGE_WHITELIST`는 `agents/r-expert.md`와 각각 동기화한다.
- 예시·fixture·기본값은 특정 응용 분야를 암시하지 않으며 통계 방법론만을 도메인으로 삼는다.
