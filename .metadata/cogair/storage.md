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
    ├── settings_server.json           # web UI 동작 중일 때만
    └── gemini-cwd/                    # gemini dispatcher 작업 디렉토리
        └── <session_id>/
```

`project_hash` = `crypto.createHash('sha256').update(cwd).digest('hex').slice(0, 12)`.

## `config.json`

```typescript
interface Config {
  ratio: { gemini: number; codex: number }; // 기본 { gemini: 1, codex: 1 }
  intervention_strength: -2 | -1 | 0 | 1 | 2; // 기본 0
  keywords: {
    gemini: string; // 기본 "research, search, youtube, large-context"
    codex: string; // 기본 "code, refactor, sandbox"
  };
  default_model: "high" | "mid" | "low" | "auto"; // 기본 'auto'
  default_options: {
    // 기본 {}
    multi_agent?: boolean;
    // 향후 확장
  };
  session_ttl_hours: number; // 기본 72
}
```

검증: `types/config.ts` 의 Zod 스키마. 누락 필드는 defaults 와 병합. 파싱 실패 시 defaults 사용 + stderr 경고.

## 세션 메타데이터 — `sessions/<hash>/<session_id>.json`

```typescript
interface SessionMeta {
  session_id: string; // UUIDv4
  provider: "gemini" | "codex";
  created_at: string; // ISO 8601
  last_used_at: string;
  turn_count: number;
  external_session_ref: string; // codex: thread UUID, gemini: index → 매핑은 sessionResolver
  cwd: string; // 원본 절대 경로 (project_hash 검증용)
  project_hash: string; // sha256(cwd).slice(0, 12) — 빠른 매칭
  model: string; // 해결된 모델 ID
  options: Record<string, unknown>; // start 시 전달된 options 원본 (감사용)
}
```

`turn_count` 는 `continue_conversation` 호출마다 +1, `start_conversation` 시 1로 초기화.

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
}
```

리셋 조건: `process.ppid !== counter.parent_pid` 면 카운터를 0 으로 리셋 + 새 PID 기록. 다음 MCP 호출 시 `core/counterManager` 가 수행.

원자성: 모든 쓰기는 `lib/atomicWrite.ts` (write to `.tmp` → rename). MCP 단일 프로세스 가정이라 락 없이 진행. 훅은 read-only.

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

## TTL 정리 (lazy)

`mcp` 서버 기동 시 1회:

1. 모든 `sessions/*/*.json` 의 `last_used_at` 검사.
2. `now - last_used_at > config.session_ttl_hours` 면 cogair 의 세션 JSON 파일과 `runtime/gemini-cwd/<session_id>/` (있으면) 삭제.
3. 비어버린 `sessions/<project_hash>/` 디렉토리는 `_meta.json` 만 남으면 함께 제거.
4. **외부 CLI 자체 세션 파일은 손대지 않는다** — `$CODEX_HOME/sessions/`, gemini 의 글로벌 세션 인덱스 등. cogair 는 자신의 매핑만 제거하며, 외부 CLI 의 자체 관리(TTL, 명시 삭제 명령 등)에 위임한다.

`runtime/counter.json`, `runtime/settings_server.json` 은 별도 정리 안 함 (재기동 시 자동 갱신).

## 권한

- 모든 파일 권한 `0o600`, 디렉토리 `0o700`.
- `config.json` 에 토큰 없음 — 자격증명은 외부 CLI(`codex login`, `gemini auth`) 가 자체 관리.

## Artifact Mirror 디스크 사용량

`artifacts.enabled=true` 인 상태에서 `location: user` 를 사용하면 `~/.claude/plugins/cogair/artifacts/<projectHash>/` 경로에 turn 단위로 `.md` 파일이 누적된다. 본 패키지는 자동 retention 정책을 적용하지 않으므로 디스크 사용량은 **사용자가 직접 관리**해야 한다. 정기 정리 예: `find ~/.claude/plugins/cogair/artifacts -type f -name '*.md' -mtime +30 -delete` (30일 초과 파일 삭제). `location: project` 의 경우 프로젝트 git 정책에 따른다 (대부분 `.gitignore` 등록 권장).

Retention 자동화는 후속 issue 로 등록 예정.
