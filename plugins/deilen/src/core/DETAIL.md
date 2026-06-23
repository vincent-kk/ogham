# core — DETAIL

## Requirements

- 모든 영속 상태(config, 세션 meta/viewer/feedback, 이미지)는 `~/.claude/plugins/deilen/` 하위에 atomicWrite 로 기록.
- 세션은 `project_hash`(cwd sha256 12-hex) 스코프 — 다른 cwd 의 세션 조회는 차단.
- long-poll resolver 는 프로세스 전역 단일 슬롯/세션 + 멱등 `settle()`.

## API Contracts

### configManager

- `loadConfig(): Promise<Config>` — 부재/손상 시 `DEFAULT_CONFIG` (Zod 기본값 채움).
- `saveConfig(config: Config): Promise<void>` — `ConfigSchema` 검증 후 atomicWrite.

### sessionStore

- `createSession({ sessionId, projectHash, title, url, markdown, createdAt, options? }): Promise<SessionMeta>` — viewer.md + meta.json.
- `getSession(sessionId, projectHash): Promise<SessionMeta | null>` — 스코프 불일치/부재 시 null.
- `readViewerMarkdown(sessionId): Promise<string | null>`.
- `closeSession(sessionId): Promise<boolean>` — meta.status='closed'.
- `clearCollectedFeedback(sessionId): Promise<void>` — feedback.json + 수집 이미지 정리, viewer.md/meta.json 보존(best-effort).
- `removeSession(sessionId): Promise<void>` — 세션 디렉터리 전체 삭제(TTL/관리용).
- `pruneExpired(ttlHours): Promise<number>` — 만료 디렉터리 제거 수.
- resolver: `awaitFeedback(sessionId, waitSeconds, signal?): Promise<SettleValue>`,
  `deliverComplete(sessionId, feedback)`, `closeResolver(sessionId)`, `settleAllResolvers()`.
  `SettleValue.kind ∈ {complete, pending, superseded, closing, aborted}`.

### feedbackStore

- `saveFeedback(sessionId, payload, images): Promise<StoredFeedback>` — feedback.json.
- `readFeedback(sessionId): Promise<StoredFeedback | null>`.

### authToken / projectHash

- `generateToken(): string` (16-byte hex), `verifyToken(expected, provided): boolean` (timing-safe).
- `getProjectHash(cwd): string` (sha256 12-hex).

## Acceptance

- resolver 의 모든 해소 경로가 `settle()` 단일 통과 — 타이머·abort 리스너 페어링.
- 손상된 config/세션 파일은 throw 하지 않고 안전 기본값으로 degrade.
- `pruneExpired` 가 만료 세션만 제거.
