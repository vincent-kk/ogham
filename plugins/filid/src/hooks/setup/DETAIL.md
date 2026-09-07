# setup contract

## Requirements

- `SessionStart` 입력을 받아 캐시 디렉터리와 로거 경로를 준비한다.
- `source`가 `compact` 또는 `clear`이면 세션 epoch를 리셋한다. `resume`과 `startup`은 대상이 아니다 — 컨텍스트가 살아 있으므로 전달 기록을 버리면 같은 규칙을 두 번 주입하게 된다.
- INTENT.md 자동 탐지로 `.filid/` 마커를 만든다.
- 만료 세션과 stale 캐시를 정리한다.
- `.claude/rules/`를 건드리지 않는다. 규칙 배포는 `/filid:setup` 스킬과 `project_setup`의 `rules-sync` action 책임이다.
- 어떤 실패도 훅을 중단시키지 않는다. 진단은 남기되 `continue: true`를 반환한다.

## API Contracts

- `processSetup(input: SessionStartInput): HookOutput` — 초기화 결과와 세션 컨텍스트 문자열.

## Acceptance Criteria

### AC-setup-epoch — 컨텍스트 소실에만 epoch를 리셋한다

- `source`가 `compact`/`clear`이면 delivered·turn·guide·fmap 마커가 제거된다.
- `resume`/`startup`에서는 기존 전달 기록이 보존된다.

### AC-setup-rule-isolation — 규칙 파일 불가침

- 훅 실행이 `.claude/rules/` 아래 어떤 파일도 생성·수정·삭제하지 않는다.

### AC-setup-nonblocking — 실패해도 통과

- 캐시 경로를 만들 수 없어도 `continue: true`를 반환한다.

## Boundary Exemptions

### setup.ts — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`, `**/__tests__/**`
- **Direct import**: allowed
- **Reason**: 훅 번들은 배럴을 import할 수 없다 — esbuild 가 배럴이 재노출하는 모듈 전체를 번들로 끌어오고, `scripts/buildHooks.mjs` 의 바이트 캡이 이를 빌드 실패로 막는다.

## History

- 2026-09-05 — managed rule 배포 소유자를 `project_setup`의 `rules-sync` action으로 갱신했다.
- 2026-07-28 — 훅 번들 직접 참조 면책을 선언하고 계약을 문서화했다.

## Last Updated

2026-09-05
