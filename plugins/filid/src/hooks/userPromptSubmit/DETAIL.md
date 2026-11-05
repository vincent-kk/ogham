# userPromptSubmit — Filid 1.0 Contract

## Requirements

- FCA 프로젝트의 user prompt마다 turn-scoped fractal map을 초기화하고 delivery TTL turn을 증가시킨다.
- 세션 첫 prompt에만 FCA 규칙 위치, 언어 태그와 비활성 규칙 요약을 주입한다.
- branch, spike lifecycle, harvest 상태 또는 agent 역할 배너를 prompt context에 추가하지 않는다.
- 비-FCA 프로젝트와 유효하지 않은 cwd는 상태를 변경하지 않고 통과시킨다.

## API Contracts

- 반환값은 항상 `continue: true`이며 user prompt를 차단하지 않는다.
- prompt context cache가 이미 존재하면 추가 context 없이 통과한다.
- 규칙 배포 여부는 대표 규칙 문서 `filid_fractal-boundaries.md` 하나로 판정한다. 4개 규칙 문서는 전부 required이고 한 번의 sync로 함께 배포되므로 대표 문서의 존재가 나머지를 함의한다. 형제 문서는 대표 문서 본문이 지목한다.
- 대표 문서의 legacy 주소는 `filid_fca-policy.md`(4개 규칙이 대체한 단일 통합 정책 문서) 하나다. 이 주소가 남아 있는 설치본은 upgrade 중간 상태이며 다음 sync 의 owned orphan 스윕이 회수한다. 접두사 없는 이름 `fca.md`는 legacy 주소로 취급하지 않는다 — `syncRuleDocs` 가 손대지 않을 주소를 훅이 active 로 보고하면 안 되기 때문이다.
- 함께 배포되는 형제 문서는 다른 이름을 가진 적이 없어 legacy 주소가 없다.

## Acceptance Criteria

구체적인 동작과 경계값은 이 모듈의 테스트가 고정하므로 별도 수락 그룹을 중복 선언하지 않는다.

## Boundary Exemptions

### userPromptSubmit.ts — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`, `**/__tests__/**`
- **Direct import**: allowed
- **Reason**: 훅 번들은 배럴을 import할 수 없다 — esbuild 가 배럴이 재노출하는 모듈 전체를 번들로 끌어오고, `scripts/buildHooks.mjs` 의 바이트 캡이 이를 빌드 실패로 막는다.

## Last Updated

세션 첫 주입 조건, 대표 규칙 문서나 legacy 주소 정책이 바뀔 때 갱신한다.
