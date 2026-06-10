# Storage — `~/.claude/plugins/cogair/`

모든 경로는 `os.homedir() + '/.claude/plugins/cogair'` 기준. atlassian 의 `~/.claude/plugins/atlassian/` 와 동일한 Claude 플러그인 데이터 규약.

디스크 JSON 키는 `snake_case` 를 유지한다 (atlassian 디스크 스키마와 동일 컨벤션). 내부 TS 타입과 변수는 `camelCase`.

## 디렉토리 레이아웃

```
~/.claude/plugins/cogair/
├── config.json
├── sessions/
│   └── <project_hash>/                # sha256(cwd).slice(0, 12)
│       ├── _meta.json                 # { cwd, created_at }
│       └── <session_id>.json
└── runtime/                           # 휘발성. 재시작 시 정리 가능.
    ├── counter.json
    ├── agy-models.json                # antigravity 모델 목록 캐시 (1시간 TTL)
    ├── settings_server.json           # web UI 동작 중일 때만
    ├── gemini-cwd/                    # gemini dispatcher 작업 디렉토리
    │   └── <session_id>/
    └── antigravity-cwd/               # antigravity dispatcher 작업 디렉토리
        └── <session_id>/
```

`project_hash` = `crypto.createHash('sha256').update(cwd).digest('hex').slice(0, 12)`.

## `config.json`

```typescript
interface Config {
  ratio: {
    gemini: { value: number; enabled: boolean }; // 기본 { value: 50, enabled: true }
    codex: { value: number; enabled: boolean }; // 기본 { value: 50, enabled: true }
    antigravity: { value: number; enabled: boolean }; // 기본 { value: 50, enabled: false }
  };
  intervention_strength: -2 | -1 | 0 | 1 | 2; // 기본 0
  keywords: {
    gemini: string; // 기본 "research, search, youtube, large-context"
    codex: string; // 기본 "code, refactor, sandbox"
    antigravity: string; // 기본 "research, search, youtube, large-context"
  };
  default_model: "high" | "mid" | "low" | "auto"; // 기본 'auto'
  option_flags: {
    gemini: { yolo: boolean; sandbox: boolean; sandbox_backend: string };
    codex: { yolo: boolean; sandbox: string };
    antigravity: { sandbox: boolean; skip_permissions: boolean };
  };
  model_map: {
    antigravity: { high: string; mid: string; low: string };
    // 기본: { high: "Gemini 3.1 Pro", mid: "Claude Sonnet 4.5", low: "Gemini 3.5 Flash" }
  };
  session_ttl_hours: number; // 기본 72
  spawn_timeout_ms: number; // 기본 600000
  artifacts: { enabled: boolean; location: "project" | "user" };
  preamble: { gemini: string; codex: string; antigravity: string };
  recency_factor: {
    gemini: "off" | "auto" | "strict"; // 기본 "auto"
    codex: "off" | "auto" | "strict"; // 기본 "off"
    antigravity: "off" | "auto" | "strict"; // 기본 "auto"
  };
}
```

검증: `types/config.ts` 의 Zod 스키마. 누락 필드는 defaults 와 병합. 파싱 실패 시 defaults 사용 + stderr 경고.

**Gemini ↔ Antigravity 상호 배제**: `ratio.gemini.enabled` 와 `ratio.antigravity.enabled` 는 동시에 `true` 가 될 수 없다. Gemini CLI 서비스는 2026-06-18 종료 예정이며, cogair 는 Antigravity CLI 로 전환 중이다. 레거시 또는 직접 편집된 config 파일에서 양쪽이 모두 `enabled: true` 인 경우 `configManager.normalizeMutualExclusion` 이 antigravity 를 우선하여 gemini 를 자동으로 비활성화한다. 설정 UI 에서 저장할 때는 `ConfigSchema` 의 `superRefine` 이 동일 규칙을 강제한다.

## 세션 메타데이터 — `sessions/<hash>/<session_id>.json`

```typescript
interface SessionMeta {
  session_id: string; // UUIDv4
  provider: "gemini" | "codex" | "antigravity";
  created_at: string; // ISO 8601
  last_used_at: string;
  turn_count: number;
  external_session_ref: string; // codex: thread UUID, gemini: index → 매핑은 sessionResolver
  // antigravity: 격리된 cwd 절대 경로
  cwd: string; // 원본 절대 경로 (project_hash 검증용)
  project_hash: string; // sha256(cwd).slice(0, 12) — 빠른 매칭
  model: string; // 해결된 모델 ID
  options: Record<string, unknown>; // start 시 전달된 options 원본 (감사용)
}
```

`turn_count` 는 `continue_conversation` 호출마다 +1, `start_conversation` 시 1로 초기화.

antigravity 의 `external_session_ref` 는 `runtime/antigravity-cwd/<session_id>/` 절대 경로다. agy 는 headless 대화 ID 를 발행하지 않으므로(Issue #7), 격리된 cwd 가 세션의 durable 핸들로 사용된다.

## `_meta.json` — 프로젝트 디렉토리 메타

```typescript
interface ProjectMeta {
  cwd: string;
  created_at: string;
}
```

`project_hash` 충돌 (sha256 12자 — 극히 드묾) 시 `cwd` 불일치를 stderr 경고. 폴더 자체는 사용.

## `runtime/counter.json`

```typescript
interface Counter {
  parent_pid: number;
  gemini: number;
  codex: number;
  antigravity: number;
}
```

리셋 조건: `process.ppid !== counter.parent_pid` 면 카운터를 0 으로 리셋 + 새 PID 기록. 다음 MCP 호출 시 `core/counterManager` 가 수행.

원자성: 모든 쓰기는 `lib/atomicWrite.ts` (write to `.tmp` → rename). MCP 단일 프로세스 가정이라 락 없이 진행. 훅은 read-only.

## `runtime/agy-models.json`

```typescript
interface AgyModelsCache {
  models: string[]; // agy models 가 반환한 모델 전체 이름 목록
  fetched_at: number; // Unix ms timestamp
}
```

`core/agyModels` 가 관리. TTL 은 1시간이며, TTL 이내이면 캐시를 반환하고 만료 시 `agy models` 를 재실행한다. 재실행 실패 시 stale 캐시로 폴백하며, 캐시도 없으면 빈 배열을 반환한다. `list_antigravity_models` MCP 도구가 이 캐시를 통해 모델 목록을 노출한다.

## `runtime/settings_server.json`

```typescript
interface SettingsServer {
  url: string;
  token: string;
  port: number;
  pid: number;
  started_at: string;
  last_activity_at: string;
}
```

`open_settings` 기동 시 작성, 종료 시 삭제. 다음 `open_settings` 호출이 `pid` 가 살아 있고 `last_activity_at` 가 5분 이내면 재사용.

## `runtime/gemini-cwd/<session_id>/`

gemini-cli 가 자체 세션 파일을 만드는 작업 디렉토리. cogair 가 세션마다 격리해 관리.

- `start_conversation` 시 디렉토리 생성.
- `continue_conversation` 시 같은 디렉토리에서 `gemini --list-sessions` 재실행 후 `--resume <index>`.
- 세션 TTL 만료 시 cogair 가 디렉토리 `rm -rf` (자체 작업 디렉토리이므로 안전).

## `runtime/antigravity-cwd/<session_id>/`

agy CLI 가 대화 기록을 저장하는 세션별 격리 작업 디렉토리. gemini-cwd 와 대칭 구조.

- `start_conversation` 시 `ensureCwd(sessionId)` 가 생성하고, 그 경로를 `externalSessionRef` 로 세션에 기록한다.
- `continue_conversation` 시 동일 경로에서 `agy --continue -p <prompt>` 를 실행한다. cwd 가 세션 정체성이므로 경로 결정은 deterministic (`antigravityCwdPath(sessionId)`).
- 타임아웃 시: `start` 는 cwd 를 삭제한다(`rm -rf`). `resume` 은 cwd 를 보존한다 — 삭제하면 이후 `--continue` 가 컨텍스트 없이 새 대화를 시작하게 된다.
- 세션 TTL 만료 시 cogair 가 `rm -rf` (자체 작업 디렉토리이므로 안전).

### Antigravity CLI 호출 규약

```
agy -p <prompt> [--dangerously-skip-permissions] [--model=<name>]
agy --continue -p <prompt> [--dangerously-skip-permissions] [--model=<name>]
```

- `--output-format` 플래그는 존재하지 않는다 — plain text 출력을 `parseJsonOutput` 이 처리한다.
- `--sandbox` 는 부착하지 않는다 (#76 종결까지 — [agy-upstream-watch.md](./agy-upstream-watch.md)). gemini 와 달리 sandbox-backend 없음.
- `--dangerously-skip-permissions` 는 `option_flags.antigravity.skip_permissions` 가 true 일 때 추가.
- 빈 stdout (Issue #76): agy 가 non-TTY(pipe) 컨텍스트에서 stdout 을 drop 할 수 있다. `parseJsonOutput` 이 null 을 반환하면 `resolveTranscript` 로 폴백하며, 폴백도 실패하면 `cli_error` 를 반환한다.

## TTL 정리 (lazy)

`mcp` 서버 기동 시 1회:

1. 모든 `sessions/*/*.json` 의 `last_used_at` 검사.
2. `now - last_used_at > config.session_ttl_hours` 면 cogair 의 세션 JSON 파일과 `runtime/gemini-cwd/<session_id>/` 또는 `runtime/antigravity-cwd/<session_id>/` (있으면) 삭제.
3. 비어버린 `sessions/<project_hash>/` 디렉토리는 `_meta.json` 만 남으면 함께 제거.
4. **외부 CLI 자체 세션 파일은 손대지 않는다** — `$CODEX_HOME/sessions/`, gemini 의 글로벌 세션 인덱스 등. cogair 는 자신의 매핑만 제거하며, 외부 CLI 의 자체 관리(TTL, 명시 삭제 명령 등)에 위임한다.

`runtime/counter.json`, `runtime/agy-models.json`, `runtime/settings_server.json` 은 별도 정리 안 함 (재기동 시 자동 갱신).

## 권한

- 모든 파일 권한 `0o600`, 디렉토리 `0o700`.
- `config.json` 에 토큰 없음 — 자격증명은 외부 CLI(`codex login`, `gemini auth`, `agy auth`) 가 자체 관리.

## Artifact Mirror 디스크 사용량

`artifacts.enabled=true` 인 상태에서 `location: user` 를 사용하면 `~/.claude/plugins/cogair/artifacts/<projectHash>/` 경로에 turn 단위로 `.md` 파일이 누적된다. 본 패키지는 자동 retention 정책을 적용하지 않으므로 디스크 사용량은 **사용자가 직접 관리**해야 한다. 정기 정리 예: `find ~/.claude/plugins/cogair/artifacts -type f -name '*.md' -mtime +30 -delete` (30일 초과 파일 삭제). `location: project` 의 경우 프로젝트 git 정책에 따른다 (대부분 `.gitignore` 등록 권장).

Retention 자동화는 후속 issue 로 등록 예정.
