## Requirements

- 성공한 `ConversationResponse` 를 단일 마크다운 파일 (YAML front-matter +
  본문) 로 디스크에 미러링한다. 호출자가 opt-in 한 경우에만 동작.
- 응답 경로를 절대 막지 않는다. 쓰기 실패는 MCP 핸들러로 전파되지 않으며,
  호출자는 `undefined` 를 받고 envelope 는 `artifact_path` 를 생략한다.
- `ArtifactsConfig.location` (`project` | `user`) 을 따라 파일을 프로젝트
  작업 디렉토리 또는 cennad 사용자 홈으로 라우팅한다.
- `ArtifactsConfig` 는 호출자가 주입한다 — 내부에서 `core/configManager` 를
  import 하지 않는다.

## API Contracts

### `writeArtifact(args: WriteArtifactArgs): Promise<string | undefined>`

입력:

- `artifacts: ArtifactsConfig` — `{ enabled, location }`. 호출자가 반드시
  `enabled === true` 를 사전 확인하고 호출한다 (작성기는 호출되면 항상
  쓰기를 시도).
- `cwd: string` — 해석된 프로젝트 루트 (start) 또는 `session.cwd` (continue).
- `projectHash: string` — `core/projectHash` 의 `sha256(cwd).slice(0,12)`.
- `sessionId: string` — `randomUUID()` 가 발급한 UUIDv4.
- `turn: number` — `start` 는 1, `continue` 는 `nextTurn`.
- `provider: 'codex' | 'antigravity' | 'claude'`.
- `model: string` — 해석된 모델 id (`result.resolvedModel` 우선, 없으면
  alias).
- `createdAt: string` — `utils/isoNow` 의 ISO 8601 타임스탬프.
- `elapsedMs: number` — dispatcher 시작 후 경과한 정수 밀리초.
- `prompt: string` — 사용자 프롬프트 원문 (raw).
- `composedPrompt?: string` — recency_policy + preamble prefix 가 합성된
  실제 CLI 전송 프롬프트. 호출자가 `composePrompt` 결과를 전달. 생략 또는
  raw 와 동일하면 본문에서 별도 섹션 생략.
- `response: string` — non-null 응답 텍스트. 호출자는 반드시
  `result.status === 'success' && result.response !== null` 을 사전 확인.

출력:

- 성공 → 작성된 artifact 의 절대 파일 경로.
- 실패 (경로 해석·렌더·atomicWrite 중 어떤 예외라도) → `undefined` +
  `logger.warn('artifact write failed', message)`.

### 파일명 규칙

`<sessionId>-<turn>.md` — `sessionId` 는 UUIDv4 (세션 수명 내 충돌 없음);
`turn` 은 호출마다 증가하는 양의 정수.

### 경로 레이아웃

- `project` → `<cwd>/.cennad/artifacts/<sessionId>-<turn>.md`
- `user` → `~/.claude/plugins/cennad/artifacts/<projectHash>/<sessionId>-<turn>.md` (`CENNAD_CONFIG_PATH` 설정 시 해당 디렉터리 하위)

`atomicWrite` 가 부모 디렉토리를 `0o700` 으로 생성하고 파일을 `0o600` 으로
쓴다 (`lib/atomicWrite` 기본값 상속).

### Front-matter

최상위 키: `session_id`, `provider`, `model`, `turn`, `created_at`,
`elapsed_ms`, `status: success`. 문자열 값은 YAML 안전을 위해
`JSON.stringify` 로 직렬화한다.

### 본문

```
## Prompt

<prompt (raw)>

## Composed Prompt (sent to CLI)   ← composedPrompt 가 raw 와 다를 때만

<composedPrompt>

## Response

<response>
```
