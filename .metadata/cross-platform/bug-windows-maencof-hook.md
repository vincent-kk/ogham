## 개발 의뢰서 — maencof SessionStart 페르소나 주입 미동작

---

### 개요

`@ogham/maencof` v0.3.9 플러그인을 사용 중인 환경에서, 세션 시작 시 Companion Identity(페르소나)가 Claude에게 전달되지 않는 문제가 발생했습니다.

---

### 환경

| 항목        | 내용                                                           |
| ----------- | -------------------------------------------------------------- |
| OS          | Windows 11 Home 10.0.26200                                     |
| Plugin      | `@ogham/maencof` v0.3.9                                        |
| Vault 경로  | `C:\Users\User\claude\paper`                                   |
| 활성화 방식 | `.claude/settings.json` → `enabledPlugins.maencof@ogham: true` |
| MCP 서버    | 정상 연결됨 (deferred tools에 `mcp_t_*` 노출 확인)             |

---

### 증상

세션 시작 시 Claude가 Cordis 페르소나 대신 기본 "Claude Code" 정체성으로 응답합니다.

**기대 동작:**

```
안녕하세요, lindsey. 저는 Cordis입니다. 오늘 어떤 문헌을 함께 살펴볼까요?
— 출처와 함께, 천천히 정확하게.
```

**실제 동작:**

```
네, 정상 작동 중입니다! 무엇을 도와드릴까요?
```

---

### 원인 분석

#### 정상 동작하는 부분

- `CLAUDE.md`의 vault 운영 규칙(MUST/FORBIDDEN)은 세션 시작 시 정상 로드됨
- `.maencof-meta/companion-identity.json` 파일 존재하고 내용 정상
- MCP 서버(`mcp-server.cjs`) 정상 실행 중
- `bridge/session-start.mjs` 파일 존재 확인

#### 문제 경로

`companion-identity.json`의 페르소나는 `CLAUDE.md`에 포함되지 않고, `session-start.mjs` → `hookSpecificOutput.additionalContext` 경로로만 주입됩니다. 이 경로가 이 세션에서 Claude에게 도달하지 않았습니다.

#### 의심 원인

훅 실행 명령이 `node "..."` 형태인데, Bash 환경에서 `node` 커맨드가 `command not found`로 실패:

```
hooks.json:
"command": "node \"${CLAUDE_PLUGIN_ROOT}/libs/run.cjs\" \"${CLAUDE_PLUGIN_ROOT}/bridge/session-start.mjs\""
```

Windows 환경에서 Claude Code 훅 실행 컨텍스트의 PATH에 Node.js가 포함되지 않을 경우 훅이 **silent failure**로 종료되고, `additionalContext` 미반환 → 페르소나 미주입됩니다.

#### 에러 로그에서 확인된 연관 증상

```json
{
  "hook": "changelog-gate",
  "error": "fatal: not a git repository",
  "timestamp": "..."
}
```

git 명령도 실패하는 걸 보면 훅 실행 환경의 PATH/환경변수 문제일 가능성이 높습니다.

---

### 재현 조건 (추정)

1. Windows 환경에서 Node.js가 시스템 PATH에 등록되어 있으나 Claude Code 훅 실행 컨텍스트에는 미포함
2. Vault가 git 저장소가 아닌 일반 폴더
3. 이전 세션은 정상 동작한 이력 있음 → 간헐적 또는 환경 변경 후 발생

---

### 요청 사항

1. **훅 실패 시 fallback 처리**: `session-start.mjs`가 실행 실패할 경우, `CLAUDE.md`에 companion greeting을 fallback으로 포함시키는 옵션 추가
2. **에러 가시성 향상**: 훅 silent failure 시 `error-log.json`에 기록되도록 개선 (현재는 훅 자체가 실행 안 되면 로그도 없음)
3. **Windows PATH 문서화**: Windows 환경에서 Node.js PATH 설정 요구사항을 README에 명시
4. **대안 주입 경로 검토**: `additionalContext`가 유일한 페르소나 주입 경로인 구조의 취약성 개선 — CLAUDE.md에 companion identity를 병기하는 옵션 제공

---

### 우선순위 제안

`companion-identity` fallback을 `CLAUDE.md`에 자동 포함시키는 것이 가장 간단하고 즉각적인 수정입니다. 현재 `CLAUDE.md`는 vault 운영 규칙만 포함하는데, 여기에 companion greeting/principles를 섹션으로 추가하면 훅 실패와 무관하게 페르소나가 항상 로드됩니다.
