## Requirements

- `antigravityDispatcher` 는 `agy -p` (start) / `agy --continue -p` (resume) 를
  세션별 격리 cwd 에서 실행하고 `DispatchResult` 로 정규화한다.
- agy `--sandbox` 는 부착하지 않는다. 복원 게이트는 업스트림 #76(non-TTY 출력
  드롭) 종결 — 추적·재검증 절차는 레포 루트 `.metadata/cennad/agy-upstream-watch.md`
  참조. `AntigravityFlags.sandbox` 는 config 하위호환을 위해 스키마에 남되 항상
  false 로 취급한다.
- agy #76: `--print` 모드가 non-TTY stdout 으로 긴 응답을 flush 하기 전에 종료해
  빈 stdout 을 반환하는 비결정적 결함. 로깅 초기화 전에 블로킹되는 행 변종도
  있다 — 이 경우 transcript 도 없어 spawn timeout 후 `cli_error` 로 끝난다.
  응답이 생성된 경우 agy 는 디스크(brain transcript)에 보존하므로, 빈 stdout 일
  때 transcript 에서 복구한다.
- 복구는 읽기 전용이다. agy 의 store·로그·세션 파일을 절대 수정하지 않는다.
- 복구 실패(파일 부재·스키마 불일치·파싱 오류)는 침묵하지 않고 기존의 명확한
  `cli_error` 로 떨어진다. 손상되거나 빈 응답을 성공으로 위장하지 않는다.

## API Contracts

### `resolveTranscript(cwd: string, since: number): Promise<string | null>`

- `callAgy` 가 빈 stdout(`parseJsonOutput` → null) 일 때 fallback 으로 호출한다.
- `cwd` = 세션 격리 cwd (`externalSessionRef`); `since` = spawn 직전
  `Date.now()` (freshness 가드).
- 복구한 응답 텍스트 또는 `null` 을 반환한다. 모든 예외는 내부에서 흡수해 `null`.

### `agyTranscriptStore` — agy 내부 store 어댑터 (격리)

agy 데이터 경로·transcript 스키마 지식을 한 모듈에 가둔다. agy 가 공식 헤드리스
출력 경로(`--output` / `--format json`)를 제공하면 이 모듈만 교체한다.

복구 절차:

1. `~/.gemini/antigravity-cli/cache/last_conversations.json` 에서 `cwd` →
   conversation id 를 조회한다 (cross-platform `samePath` 로 경로 비교 — Windows
   separator·case 차이를 흡수).
2. `~/.gemini/antigravity-cli/brain/<convId>/.system_generated/logs/transcript.jsonl`
   의 `mtime ≥ since` 를 확인한다 (stale 방지).
3. `normalizeEol` 로 정규화한 뒤 JSONL 을 줄 단위로 파싱하고, 마지막
   `source=MODEL, type=PLANNER_RESPONSE, status=DONE` 엔트리의 `content` 를
   추출한다 (CRLF 대비).
4. 어느 단계든 실패하면 `null`.

### Acceptance

- start 빈 stdout + transcript 존재 → 복구 텍스트로 `success`.
- start 빈 stdout + transcript 부재 → `cli_error`.
- resume 은 `--continue` 가 대화에 턴을 추가하므로 재시도 대상이 아니다.
- `sandbox: true` 입력이어도 start/resume argv 에 `--sandbox` 가 없다.

### Caveats

- transcript 경로·스키마는 agy 비문서화 내부 구조(agy 1.0.7 기준)다. agy 1.0.4+
  는 `.db`(SQLite)를 공식 포맷으로 병행 기록하므로, 향후 JSONL 폐기 시 복구가
  깨질 수 있다 — 그 경우 `null` → `cli_error` 로 안전하게 실패한다.
- 멀티바이트 경계 손상이 드물게 남을 수 있다 (빈 응답보다는 우월).
