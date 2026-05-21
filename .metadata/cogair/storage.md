# Storage — `~/.claude/plugins/cogair/`

모든 경로는 `os.homedir() + '/.claude/plugins/cogair'` 기준. atlassian 의 `~/.claude/plugins/atlassian/` 와 동일한 Claude 플러그인 데이터 규약을 따른다.

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
    └── settings_server.json           # web UI 동작 중일 때만
```

`project_hash` = `crypto.createHash('sha256').update(cwd).digest('hex').slice(0, 12)`.

## `config.json`

```typescript
interface Config {
  ratio: { gemini: number; codex: number };          // 기본 { gemini: 1, codex: 1 }
  intervention_strength: -2 | -1 | 0 | 1 | 2;        // 기본 0
  keywords: {
    gemini: string;                                  // 기본 "research, search, youtube, large-context"
    codex: string;                                   // 기본 "code, refactor, sandbox"
  };
  default_model: 'high' | 'mid' | 'low' | 'auto';    // 기본 'auto'
  default_multi_agent: boolean;                      // 기본 false
  session_ttl_hours: number;                         // 기본 72
}
```

검증: `types/config.ts` 의 Zod 스키마. 누락 필드는 defaults 와 병합. 파싱 실패 시 `defaults.ts` 의 값을 사용하고 stderr 에 경고.

## 세션 메타데이터 — `sessions/<hash>/<session_id>.json`

```typescript
interface SessionMeta {
  session_id: string;             // UUIDv4
  provider: 'gemini' | 'codex';
  created_at: string;             // ISO 8601
  last_used_at: string;
  turn_count: number;
  external_session_ref: string;   // codex: thread UUID, gemini: index → 매핑은 session-resolver
  cwd: string;                    // 디버깅용 원본 cwd
  model: string;                  // 해결된 모델 ID
}
```

`turn_count` 는 `continue_conversation` 호출마다 +1, `start_conversation` 시 1로 초기화.

## `_meta.json` — 프로젝트 디렉토리 메타

```typescript
interface ProjectMeta {
  cwd: string;                    // 원본 절대 경로 (디버깅 + 충돌 감지)
  created_at: string;
}
```

`project_hash` 충돌 (극히 드물지만 sha256 12자) 시 `cwd` 불일치를 stderr 경고. 폴더 자체는 사용.

## `runtime/counter.json`

```typescript
interface Counter {
  parent_pid: number;             // Claude Code 프로세스의 부모 PID
  gemini: number;                 // 시도 카운터
  codex: number;
}
```

리셋 조건: 부모 PID 변경 감지. `process.ppid !== counter.parent_pid` 면 카운터 0 으로 리셋 후 새 PID 기록.

원자성: 모든 쓰기는 `lib/atomic-write.ts` (write to `.tmp` → rename) 사용. 동시 쓰기 충돌은 `mcp` 단일 프로세스 가정이라 락 없이 진행. 훅은 read-only.

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

`open_settings` 가 기동 시 작성, 종료 시 삭제. 다음 `open_settings` 호출이 `pid` 가 살아 있고 `last_activity_at` 가 5분 이내면 재사용.

## TTL 정리 (lazy)

`mcp` 서버 기동 시 1회:

1. 모든 `sessions/*/*.json` 의 `last_used_at` 검사.
2. `now - last_used_at > config.session_ttl_hours` 면 파일 삭제.
3. 비어버린 `sessions/<project_hash>/` 디렉토리는 `_meta.json` 만 남으면 함께 제거.

`runtime/*.json` 은 별도 정리 안 함 (재기동 시 자동 갱신).

## 권한

- 모든 파일 권한 `0o600`, 디렉토리 `0o700`.
- `config.json` 에 토큰 없음 — 자격증명은 외부 CLI(`codex login`, `gemini auth`) 가 자체 관리.
