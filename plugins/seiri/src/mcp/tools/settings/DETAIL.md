# settings — Contract

## Requirements

- 단일 도구가 `open`·`status`·`manifest`·`plan`·`sync`·`config` 여섯 `action` 을 제공한다.
- `open` 은 로컬 설정 폼을 띄우고 bounded long-poll 로 저장·닫힘을 기다리며 서버는 `127.0.0.1` 에만 바인딩한다.
- 로컬 서버 가드는 `@ogham/http-kit` 을 재사용하고 토큰·Origin 검증을 재구현하지 않는다.
- 프로젝트 루트는 `@ogham/cross-platform` 의 `projectRoot(project_root?)` 로 해석하며 `process.cwd()` 폴백을 두지 않는다.
- 브라우저와 헤드리스 경로는 같은 `planRuleDocs`·`applyRuleDocs` 판정을 사용한다.
- `sync` 는 계획을 먼저 보여준 뒤에만 적용하고 드리프트한 파일은 `resync` 에 id 가 명시된 때만 덮어쓴다.
- `selections` 에서 빠진 id 는 배포 해제로 읽는다.
- `config` 는 플러그인 루트 확인 전에 분기하며 런타임 밸브만 조회·설정·해제한다.
- `open` 대기는 `[1, MAX_WAIT_SECONDS]` 로 clamp 하고 `extra.signal` 을 전파한다.
- 종료 상태는 토큰 없는 origin 만 반환하며 `OGHAM_NO_BROWSER` 에서는 탭을 열지 않는다.

## API Contracts

- `handleSettings(input, extra?)` — 입력의 `action` 에 따라 브라우저 또는 헤드리스 핸들러를 호출하고 `Promise<SettingsOutput>` 을 반환한다.
- `open` — `{ action: 'open', status: 'saved' | 'closed' | 'pending', url, summary?, message }`; `pending` 재호출은 같은 서버 세션을 이어 기다린다.
- `status` — `{ action: 'status', entries }`; 현재 레이어 채널의 배포 상태와 드리프트.
- `manifest` — `{ action: 'manifest', manifest }`; 관리 대상 규칙 목록.
- `plan`·`sync` — `{ action, result, selected }`; 같은 계획을 각각 미적용·적용 상태로 반환한다.
- `config` — `{ action: 'config', op, changed, dial, posture }`; `set` 은 유효한 `intervention` 을 요구한다.

## Acceptance Criteria

### AC-settle-bounded — 유계 대기

- `open` 은 저장·닫힘·만료 셋 중 하나로 반드시 종결된다.

### AC-revision-match — 미리보기 일치

- 브라우저 미리보기 이후 대상이 바뀌면 적용하지 않는다.

### AC-loopback-only — 바인딩 격리

- 서버가 `127.0.0.1` 외 주소에서 접근 가능하지 않다.

### AC-plan-before-apply — 적용 전 계획

- `sync` 가 적용하는 대상이 같은 입력의 `plan` 대상과 일치한다.

### AC-omission-is-removal — 생략의 의미

- `selections` 에서 빠진 규칙이 배포에서 제거된다.

### AC-drift-explicit-resync — 드리프트 명시 덮어쓰기

- 드리프트한 파일은 `resync` 에 id 가 있을 때만 덮어쓰인다.

## Last Updated

2026-09-05 — 설정 페이지·헤드리스 동기화·다이얼을 `settings` 한 도구의 `action` 계약으로 통합했다.
