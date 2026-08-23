# r-statistics — Contract

## Requirements

- 플러그인의 유일한 도메인은 통계 방법론이다. 스킬·에이전트·예시·기본값 어디에도 특정 응용 분야를 암시하는 어휘를 두지 않는다.
- 비결정 추론(에이전트)과 결정적 판정(MCP)을 분리한다: 에이전트는 방법을 **추천**하고, `assert_analysis_plan` 의 hard gate 가 실행 가능 여부를 **결정**한다.
- 디스크 경로는 `~/.claude/plugins/r-statistics/` 하위로 한정한다.
- `bridge/` 는 의도적으로 커밋하는 배포 산출물이고 배포용 중간 디렉터리는 커밋하지 않는다.
- 버전은 `scripts/injectVersion.mjs` 만 갱신한다 — `version.ts` 와 `plugin.json` 의 version 을 손으로 고치지 않는다.
- 에이전트는 `agents/` 에서 자동 발견된다. `plugin.json` 에 `agents` 필드를 두지 않는다.

## API Contracts

- MCP 표면은 R job 수명주기와 분석 계획 hard gate를 분리하며, 서버 이름 `tools`와 전체 이름 `mcp__plugin_r-statistics_tools__<name>` 형식을 유지한다.
- `analyze` Dispatcher는 초기 컨텍스트를 제한하기 위해 방법론 자료를 `skills/analyze/references/methods/`에서 lazy 로드한다.
- 에이전트는 방법 추천, R 실행, 방법론 검증을 분리하고 실행 허용의 최종 판정은 맡지 않는다.
- **R 실행계약**: `shared/contract.R` 이 init/finalize 와 아티팩트 헬퍼를 제공하며 모든 `run_r` 실행이 이를 먼저 로드한다.
- **빌드 파이프라인**: `clean → version:sync → build:compile → build:mcp → build:compile-plugin`.

## Acceptance Criteria

### AC-domain-neutrality — 응용 도메인 중립

- 공개 예시·표본 변수명·기본값이 특정 응용 분야를 암시하지 않는다.
- 룰셋이 다루는 기법군마다 비임상 use-case 가 최소 하나 함께 제시된다.

### AC-ruleset-catalog-sync — 룰셋과 카탈로그 동기화

- `src/mcp/tools/assertAnalysisPlan/operations/ruleset.ts` 의 모든 기법에 대응하는 `skills/analyze/references/methods/*/meta.yaml` 이 존재한다.
- `REQUIRED_PACKAGES`·`PACKAGE_USE_CASES` 는 `skills/setup/references/packages.md` 와, `PACKAGE_WHITELIST` 는 `agents/r-expert.md` 와 일치한다.

### AC-decision-authority — 판정 권한 분리

- 에이전트 문서 어디에도 실행 허용을 최종 결정한다는 서술이 없다.
- 실행 가능 여부는 `assert_analysis_plan` 의 결정적 출력에서만 나온다.

### AC-generated-artifacts — 산출물 규약

- `bridge/` 는 커밋되고 배포용 중간 디렉터리는 커밋되지 않는다.
- `version.ts` 와 `plugin.json` 의 version 에 손편집 흔적이 없다.

## Last Updated

2026-08-23 — 배포 디렉터리 규약과 분석 방법 reference 위치를 현재 구조에 맞췄다.
