# openSettings — Contract

## Requirements

- MCP 도구 `open_settings` 의 핸들러다. 등록은 `mcp/server` 가 `wrapHandler` 로 감싸며, 이 도구만 MCP 요청의 `extra.signal` 을 받아 대기 중 취소를 관측한다.
- 대기는 반드시 유한하다. `wait_seconds` 를 `[1, MAX_WAIT_SECONDS]` 로 클램프하고 기본값은 `DEFAULT_WAIT_SECONDS` 다 — 무한 대기는 세션을 붙잡는다.
- 상한이 지나도 폼을 닫지 않는다. `pending` 은 "아직"이라는 답이며, 같은 세션에서 다시 호출해 대기를 이어 간다. setup 워크플로가 같은 턴에서 캐시 채우기로 넘어갈 수 있는 이유다.
- 서버는 프로젝트 루트당 하나다. 다른 루트로 호출이 오면 기존 서버를 닫고 새로 띄운다 — 한 서버가 두 워크스페이스의 설정을 섬길 수 없다.
- 세션만 아는 사실(가용 provider, 감지한 repo, Jira 프로젝트 목록)은 `bootstrap` 으로 주입받는다. 이 핸들러가 원격을 조회하지 않는다.
- 저장은 `core/configManager` 의 `saveConfig` 만 거친다. 라벨 프로비저닝 같은 페이지 의도는 요약으로만 전달하고 여기서 실행하지 않는다.

## API Contracts

```typescript
export function handleOpenSettings(
  input: OpenSettingsInput,
  extra?: OpenSettingsToolExtra,
): Promise<OpenSettingsOutput>;

interface OpenSettingsInput {
  project_root?: string;
  wait_seconds?: number; // 기본 300, 상한 600, 하한 1
  bootstrap?: SettingsBootstrap;
}

interface OpenSettingsOutput {
  status: 'saved' | 'closed' | 'pending';
  url: string;
  summary?: SettingsSaveSummary; // saved 에서만
  message: string;
}
```

- 배럴은 `handleOpenSettings` 와 상수 `DEFAULT_WAIT_SECONDS`(300)·`MAX_WAIT_SECONDS`(600), 그리고 세 입출력 타입을 노출한다 — 이 fractal 만이 상수를 재노출하는 도구다.
- `bootstrap` 은 전달한 호출에서만 갱신되고, 생략한 호출은 마지막으로 주입된 값을 그대로 쓴다. 스키마는 `SettingsBootstrapSchema`(`providers.{jira,github}`, `jira_projects[]`, `github_repo`).
- `url` — `saved`·`closed` 는 토큰 없는 origin 기준 URL 을, `pending` 은 토큰이 붙은 서버 URL 을 준다. 아직 열려 있는 페이지를 사람이 다시 열 수 있어야 하기 때문이며, 종료된 흐름에서는 토큰을 되울리지 않는다.
- `summary` — `{ configWritten, provider, projectRef, provisionLabels }`. `saved` 응답에만 실린다.
- 페이지 상태는 `buildSettingsState` 가 만든다: 계층별 설정(`configByScope`), 계층 문서와 재정의 경로(`scope`), project 계층 파일의 존재 여부(`configExists`), 프로젝트 루트 basename 에서 파생한 `suggestedLocalKey`(영숫자만 남겨 대문자화, 비면 `LOCAL`), 그리고 `bootstrap`.
- 설정 HTML 은 `public/settings.html` 을 런타임에 읽어 프로세스 수명 동안 캐시한다 — MCP 번들에 인라인하지 않는다. 파일을 찾지 못하면 탐색 경로를 담은 오류로 기동이 실패한다.
- 브라우저 열기는 신규 기동 시에만 시도하는 best-effort 다. `OGHAM_NO_BROWSER` 에서는 no-op 이며 URL 은 그대로 반환된다.
- HTTP 표면(loopback 바인딩, token/Origin 가드, settle waiter)은 자식 fractal `webServer/` 의 계약이다.

## Acceptance Criteria

### AC-bounded-wait — 유한 대기

- `wait_seconds` 는 1 미만이면 1로, 600 초과면 600으로 클램프된다. 생략 시 300 이다.
- 상한이 지나면 `pending` 으로 반환한다 — 무한정 매달리지 않는다.

### AC-pending-keeps-session — pending 은 세션을 유지한다

- `pending` 응답 뒤 서버가 살아 있고, 같은 프로젝트 루트로 다시 호출하면 새 서버를 띄우지 않고 같은 세션에서 대기를 이어 간다.

### AC-token-not-echoed-on-terminal — 종료 응답에 토큰 없음

- `saved`·`closed` 응답의 `url` 에는 `token` 질의 문자열이 없다.

### AC-server-follows-root — 루트를 따라가는 서버

- 다른 `project_root` 로 호출하면 기존 서버가 닫히고 새 루트에 바인딩된 서버가 뜬다.

### AC-saved-carries-summary — 저장 결과 요약

- `saved` 응답에만 `summary` 가 실리고, 그 시점에 지정된 계층 설정 파일이 기록되어 있다.

## Last Updated

2026-07-30 — bounded long-poll 계약과 토큰 노출·서버 재사용 규약을 문서화했다.
