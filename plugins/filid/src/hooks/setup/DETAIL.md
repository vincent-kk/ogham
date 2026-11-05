# setup contract

## Requirements

- `SessionStart` 입력을 받아 캐시 디렉터리와 로거 경로를 준비한다.
- `source`가 `compact` 또는 `clear`이면 세션 epoch를 리셋한다. `resume`과 `startup`은 대상이 아니다 — 컨텍스트가 살아 있으므로 전달 기록을 버리면 같은 규칙을 두 번 주입하게 된다.
- INTENT.md 자동 탐지로 `.filid/` 마커를 만든다.
- 만료 세션과 stale 캐시를 정리한다.
- `.claude/rules/`를 건드리지 않는다. 규칙 배포는 `/filid:setup` 스킬과 `project_setup`의 `rules-sync` action 책임이다.
- 어떤 실패도 훅을 중단시키지 않는다. 진단은 남기되 `continue: true`를 반환한다.

## API Contracts

입출력 형태는 handler에서 확인한다. 초기화 실패는 진단으로 남기되 세션 시작을 차단하지 않는다.

## Acceptance Criteria

구체적인 동작과 경계값은 이 모듈의 테스트가 고정하므로 별도 수락 그룹을 중복 선언하지 않는다.

## Boundary Exemptions

### setup.ts — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`, `**/__tests__/**`
- **Direct import**: allowed
- **Reason**: 훅 번들은 배럴을 import할 수 없다 — esbuild 가 배럴이 재노출하는 모듈 전체를 번들로 끌어오고, `scripts/buildHooks.mjs` 의 바이트 캡이 이를 빌드 실패로 막는다.

## Last Updated

session epoch 초기화 조건, cache 정리나 규칙 배포 비관여 정책이 바뀔 때 갱신한다.
