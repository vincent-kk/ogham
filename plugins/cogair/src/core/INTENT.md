## Purpose

`@ogham/cogair` 의 디스크 저장소 게이트웨이. config / counter / session / project-hash / auth-token 의 read·write 경로를 담당.

## Structure

| Module            | Role                                                                    |
| ----------------- | ----------------------------------------------------------------------- |
| `configManager/`  | `~/.claude/plugins/cogair/config.json` 로드·저장                        |
| `counterManager/` | `runtime/counter.json` 으로 provider 호출 카운트 추적 (parent-pid 리셋) |
| `projectHash/`    | `sha256(cwd).slice(0,12)` 계산                                          |
| `sessionStore/`   | `sessions/<hash>/<id>.json` CRUD + TTL prune                            |
| `authToken/`      | settings web UI 일회용 토큰 발급·검증                                   |
| `artifactWriter/` | opt-in 마크다운 artifact 미러 (project/user 위치)                       |
| `agyModels/`      | `agy models` CLI 출력 캐싱 → 사용 가능한 Antigravity 모델 목록 제공     |
| `youtubeMcp/`     | yt-dlp-mcp MCP addon 을 antigravity·codex 에 멱등 등록·해제             |

## Conventions

- 모든 write 는 `lib/atomicWrite.ts` 경유 (tmp → rename)
- 디스크 JSON 키는 snake_case, 함수·변수는 camelCase
- 스키마 검증은 `types/` 의 Zod 정의 재사용 (신규 스키마 추가 금지)
- 경로 상수는 `constants/paths.ts` 만 신뢰
- 시간은 `utils/isoNow.ts`, parent-pid 는 `utils/parentPid.ts`

## Boundaries

### Always do

- 파일 누락·파싱 실패 시 안전한 기본값 + stderr 경고
- `pruneExpired` 는 cogair 가 만든 매핑·작업 디렉토리만 제거
- `getSession` 은 project_hash 불일치 시 `null` 반환 (fallback 검색 금지)

### Ask first

- 새 디스크 파일·디렉토리 추가
- 디스크 JSON 키 스키마 변경

### Never do

- 외부 CLI 의 세션 인덱스(`$CODEX_HOME/sessions/`, gemini 글로벌) 삭제·수정
- 동일 키에 lock 없이 동시 write (MCP 단일 프로세스 가정)
- 인자 없는 전역 경로 mutation

## Dependencies

- `node:crypto` (sha256, randomBytes, randomUUID, timingSafeEqual)
- `node:fs/promises`, `node:path`
- `zod` (types 재사용)
