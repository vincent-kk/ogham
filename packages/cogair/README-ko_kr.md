# @ogham/cogair

Claude 가 필요에 따라 **OpenAI Codex CLI** 또는 **Google Gemini CLI** 로 작업을 위임할 수 있게 해주는 Claude Code 플러그인입니다. MCP 도구 3개, 사용자 호출 가능 스킬 3개, 라이프사이클 훅 2개로 구성됩니다.

`atlassian` 이나 `filid` 가 도메인 지식을 캡슐화한다면, cogair 는 **위임 표면(delegation surface)** 입니다. 다른 모델 패밀리가 더 적합한 작업(무거운 코드 → codex, 실시간 웹 검색 → gemini)에서 Claude 가 위임을 결정하면, 플러그인이 세션 관리·비율 추적·세션별 호출 카운터를 처리합니다.

---

## 설치

### Marketplace 를 통한 설치 (권장)

```bash
# 1. Marketplace 에 저장소 등록
claude plugin marketplace add https://github.com/vincent-kk/ogham

# 2. 플러그인 설치
claude plugin install cogair
```

설치 후 별도 설정 없이 모든 컴포넌트(MCP, Skills, Hooks)가 자동 등록됩니다.

### 개발자용 로컬 설치

```bash
yarn install
cd packages/cogair
yarn build
claude --plugin-dir ./packages/cogair
```

빌드하면 `bridge/mcp-server.cjs`, `bridge/injectStatic.mjs`, `bridge/injectDynamic.mjs` 가 생성됩니다.

### 사전 조건

플러그인은 외부 CLI 를 spawn 합니다. 직접 설치·인증해야 합니다:

- `codex` (OpenAI Codex CLI) — `codex login` 실행
- `gemini` (Google Gemini CLI) — `gemini auth login` 실행

cogair 는 절대 설치하거나 대신 로그인하지 않습니다. 인증이 누락된 경우 실패 응답에 `error.code: 'auth'` 가 담기고, 해당 스킬이 적절한 로그인 명령을 안내합니다.

---

## 사용법

### 초기 설정

```
/setup
```

로컬 웹 UI 를 띄워 provider 비율(target % + provider 별 활성화 토글), intervention strength(`-2` … `+2`), 키워드 라우팅 힌트, 기본 모델 alias, 기본 옵션을 설정합니다. UI 는 `127.0.0.1` 에서 일회용 토큰과 함께 실행되며 5분 idle 후 자동 종료됩니다.

### Codex 위임

```
/codex -- "src/auth 의 OTP 흐름을 상태 머신으로 리팩토링해줘"
/codex --model high -- "샌드박스 안에서 오래 걸리는 리팩토링 작업"
/codex --continue <session_id> -- "이제 모듈 B 의 diff 를 만들어줘"
```

무거운 코드 생성·리팩토링·샌드박스 셸 작업, 또는 다른 모델 패밀리의 second opinion 에 사용하세요.

### Gemini 위임

```
/gemini -- "최근 Next.js 15 릴리즈 노트를 요약해줘"
/gemini --model high -- "이 RFC 초안 3개를 비교해줘"
/gemini --continue <session_id> -- "그 분석을 ... 까지 확장해줘"
```

실시간 웹 그라운딩 리서치, 매우 큰 컨텍스트의 다문서 종합, YouTube/URL 입력, 또는 Claude 학습 컷오프 이후의 지식이 필요할 때 사용하세요.

---

## 아키텍처

```
Claude Code session
   │
   ├── Skills (/setup, /codex, /gemini)        Layer 3 (user) — 얇은 도구 호출 매퍼
   │       │
   │       ▼
   ├── MCP "tools" 서버                          Layer 2 (logic) — 3 MCP 도구
   │       │
   │       ▼
   ├── Dispatcher (codex / gemini)              외부 CLI spawn + 출력 파싱
   │       │
   │       ▼
   ├── Core storage                             ~/.claude/plugins/cogair/...
   │
   └── Hooks (SessionStart, UserPromptSubmit)   Layer 1 (auto) — read-only 컨텍스트 주입
```

단일 dispatch 레이어 — 스킬과 MCP 서버 사이에 agent 가 없습니다. Hook 은 격리된 얇은 스크립트로, `src/core/` 나 `src/types/` 를 import 하지 않습니다 (zod·MCP SDK 가 번들에 들어가면 cap 위반).

### MCP 도구

| 도구                    | 역할                                                                  |
| ----------------------- | --------------------------------------------------------------------- |
| `start_conversation`    | `codex` 또는 `gemini` 를 spawn 해 정규화된 envelope 응답을 반환.       |
| `continue_conversation` | `session_id` 로 기존 세션 재개 (project-hash 단위 격리).               |
| `open_settings`         | 로컬 설정 UI 를 띄우고 일회용 토큰이 포함된 URL 을 반환.                |

### 스킬

| 스킬      | 트리거 키워드                                       |
| --------- | --------------------------------------------------- |
| `/setup`  | "cogair 설정", "open cogair settings", "개입 강도"    |
| `/codex`  | "ask codex", "codex 호출", "코덱스에게"              |
| `/gemini` | "ask gemini", "gemini 호출", "제미니에게"            |

### Hook

| 이벤트             | Bridge 번들          | 주입 내용                                                                  |
| ------------------ | -------------------- | -------------------------------------------------------------------------- |
| `SessionStart`     | `injectStatic.mjs`   | Provider 비율·tone phrase·키워드 맵·라우팅 가이드.                          |
| `UserPromptSubmit` | `injectDynamic.mjs`  | 세션별 호출 카운터·현재 비율·목표 비율·drift, parent-PID 감지.              |

두 hook 번들 모두 minify 후 < 4 KB 이며, Node 빌트인만 사용합니다 (zod·MCP SDK·glob 라이브러리 없음).

---

## 디스크 레이아웃

cogair 의 모든 상태는 `~/.claude/plugins/cogair/` 하위에 저장됩니다:

```
~/.claude/plugins/cogair/
├── config.json                    # 사용자 설정
├── runtime/
│   ├── counter.json               # parent-PID 기준 호출 카운터
│   └── settings_server.json       # 세션 중 활성 설정 UI 상태
└── sessions/
    └── <project_hash>/            # sha256(cwd).slice(0, 12)
        └── <session_id>.json
```

세션은 프로젝트 단위로 격리됩니다. 다른 `cwd` 에서 `continue_conversation` 을 호출하면 `error.code: 'unknown'` 을 반환 — 프로젝트 간 세션 상태 누설 방지.

---

## 모델 Alias

각 provider 는 4개 tier alias 를 노출합니다. 구체적인 모델 ID 는 dispatcher (`src/dispatcher/<provider>/modelAlias.ts`) 에만 존재하므로, 상류 CLI 가 모델명을 바꿔도 영향 범위가 한 파일로 제한됩니다.

| alias  | 의미                                          |
| ------ | --------------------------------------------- |
| `high` | provider 의 가장 강력한 모델                   |
| `mid`  | 균형 잡힌 모델                                 |
| `low`  | 가장 빠르고 저렴한 모델                         |
| `auto` | CLI 기본값 (`-m` 생략)                          |

환경 변수 override: `COGAIR_CODEX_{HIGH,MID,LOW}`, `COGAIR_GEMINI_{HIGH,MID,LOW}`.

---

## 개발

```bash
yarn dev            # TypeScript watch 모드
yarn test           # Vitest watch
yarn test:run       # 1회 실행 (CI)
yarn typecheck      # 타입 체크 (emit 없음)
yarn build          # clean → version:sync → settingsHtml → tsc → mcpServer → hooks
```

### 기술 스택

TypeScript 5.7, @modelcontextprotocol/sdk, esbuild, Vitest, Zod.

---

## 상세 문서

기술 세부사항 및 설계 결정은 [`.metadata/cogair/`](../../.metadata/cogair/) 참조:

| 문서                                                             | 내용                                            |
| ---------------------------------------------------------------- | ----------------------------------------------- |
| [README](../../.metadata/cogair/README.md)                       | 스펙 인덱스 + 핵심 결정                          |
| [spec](../../.metadata/cogair/spec.md)                           | 책임 분리·데이터 흐름·비채택 사항                  |
| [architecture](../../.metadata/cogair/architecture.md)           | 모듈 트리·의존 방향·빌드 파이프라인                |
| [mcp-tools](../../.metadata/cogair/mcp-tools.md)                 | 3 MCP 도구 (입력 스키마·동작·envelope)            |
| [skills](../../.metadata/cogair/skills.md)                       | 스킬 본문 + 도구 호출 매핑                        |
| [hooks](../../.metadata/cogair/hooks.md)                         | SessionStart / UserPromptSubmit 주입             |
| [provider-dispatch](../../.metadata/cogair/provider-dispatch.md) | codex-cli / gemini-cli 호출 매트릭스              |
| [storage](../../.metadata/cogair/storage.md)                     | `~/.claude/plugins/cogair/` 디스크 레이아웃       |
| [web-ui](../../.metadata/cogair/web-ui.md)                       | 로컬 설정 UI 설계                                 |
| [roadmap](../../.metadata/cogair/roadmap.md)                     | 단계별 구현 계획                                  |

[English documentation (README.md)](./README.md) is also available.

---

## License

MIT
