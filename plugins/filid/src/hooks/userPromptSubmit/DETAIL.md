# userPromptSubmit — Filid 1.0 Contract

## Requirements

- FCA 프로젝트의 user prompt마다 turn-scoped fractal map을 초기화하고 delivery TTL turn을 증가시킨다.
- 세션 첫 prompt에만 FCA 규칙 위치, 언어 태그와 비활성 규칙 요약을 주입한다.
- branch, spike lifecycle, harvest 상태 또는 agent 역할 배너를 prompt context에 추가하지 않는다.
- 비-FCA 프로젝트와 유효하지 않은 cwd는 상태를 변경하지 않고 통과시킨다.

## API Contracts

- `handleUserPromptSubmit(input): HookOutput` — map reset과 turn 증가 후 session-first context 결과를 반환한다.
- 반환값은 항상 `continue: true`이며 user prompt를 차단하지 않는다.
- prompt context cache가 이미 존재하면 추가 context 없이 통과한다.
- 규칙 배포 여부는 대표 규칙 문서 `filid_fractal-boundaries.md` 하나로 판정한다. 4개 규칙 문서는 전부 required이고 한 번의 sync로 함께 배포되므로 대표 문서의 존재가 나머지를 함의한다. 형제 문서는 대표 문서 본문이 지목한다.
- 대표 문서의 legacy 주소는 `filid_fca-policy.md`(4개 규칙이 대체한 단일 통합 정책 문서) 하나다. 이 주소가 남아 있는 설치본은 upgrade 중간 상태이며 다음 sync 의 owned orphan 스윕이 회수한다. 접두사 이전 이름 `fca.md`는 더 이상 취급하지 않는다 — `syncRuleDocs` 가 손대지 않을 주소를 훅이 active 로 보고하면 안 되기 때문이다.
- 함께 배포되는 형제 문서는 다른 이름을 가진 적이 없어 legacy 주소가 없다.

## Acceptance Criteria

### AC-prompt-session-first — 세션 최초 주입

- 첫 prompt는 FCA pointer와 `[filid:lang]`을 포함하고 같은 session의 두 번째 prompt는 조용히 통과한다.
- 서로 다른 session은 독립적으로 최초 context를 전달한다.

### AC-prompt-no-mode-banner — 모드 비의존성

- spike 이름의 branch에서도 첫 prompt 출력은 session-first FCA context만 포함한다.
- 이후 prompt에는 spike/harvest 관련 배너가 다시 주입되지 않는다.

## Last Updated

2026-07-28 — 규칙 문서가 4개로 분할되어 대표 문서 포인터와 legacy 주소 사슬을 계약에 명시했다.
