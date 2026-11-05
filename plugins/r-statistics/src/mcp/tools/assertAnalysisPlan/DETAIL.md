# assertAnalysisPlan — Contract

## Requirements

- `assert_analysis_plan` 은 입력의 순수 함수다 — R 을 실행하지 않고, 파일을 쓰지 않으며, 자연어 판단을 하지 않는다.
- hard 위반은 모드와 무관하게 항상 차단한다. soft 위반은 interactive 에서 경고로 허용하고 auto 에서 차단한다.
- 가정 아티팩트가 없으면 위반이 아니라 `unverified` soft 경고로 다룬다.
- 룰셋에 등록되지 않은 기법은 차단이 아니라 soft 경고다 — 미등록이 곧 부적합은 아니다.
- 룰셋(`operations/ruleset.ts`)은 `skills/analyze/references/methods/*/meta.yaml` 의 미러이며 둘은 함께 바뀐다.
- 예시·기본값·표본 변수명은 어떤 응용 분야도 암시하지 않는다.

## API Contracts

interactive에서 soft 위반을 허용하는 것은 개선 기회를 주기 위함이다.

## Acceptance Criteria

구체적인 동작과 수치 기준은 소유 모듈의 테스트가 고정하며, 이 문서는 그 선택의 이유와 변경 경계를 기록한다.

## Last Updated

hard/soft 판정·카탈로그 동기화·도메인 중립 정책의 내용이나 적용 범위가 바뀔 때 갱신한다.
