## Requirements

- `antigravityDispatcher` 는 `agy -p` (start) / `agy --continue -p` (resume) 를 세션별 격리 cwd 에서 실행하고 `DispatchResult` 로 정규화한다.
- **세션 지목**: stream-json 의 `init`·`result` 이벤트가 `conversation_id` 를 실어 주므로 start 는 그것을 `externalSessionRef` 로 기록하고, resume 은 `--conversation <id>` 로 그 대화를 정확히 지목한다 (실측: 다른 cwd 에서도 이전 turn 의 문맥이 유지됨). id 를 못 얻은 경우(빈 stdout 을 transcript 로 복구한 run)만 cwd 를 ref 로 남기고 `--continue`(그 디렉터리의 최근 대화)로 재개한다 — cwd 격리가 계속 필요한 이유. 그런 세션도 resume 이 스트림에서 id 를 받는 순간 ref 가 그 id 로 승격되어(dispatcher 반환값 → session store) 이후 턴은 대화를 이름으로 지목한다.
- **출력·시간 계약**: `--output-format stream-json` 으로 실행해 `step_update` 이벤트가 `spawnCli` 의 idle timer 를 계속 리셋하게 하고, `--print-timeout <tier hard cap>` 으로 agy 자체 기본 5분을 대체한다. 둘 중 하나라도 빠지면 상위 tier 의 장시간 실행이 agy 쪽에서 잘린다. 응답은 마지막 `event:"result"` 의 `result.response`(단, `result.status === 'SUCCESS'`)를 취한다. **stream-json 을 아는 agy 가 최소 요구사항**이다 — 두 플래그를 항상 보내므로 모르는 빌드는 자체 arg 검사에서 종료해 파서에 닿지 않는다(`cli_error`). 단일 JSON·plain text 분기는 출력 형태가 예상과 다를 때의 관용으로만 남는다.
- **모델 선택 계약**: tier config의 모델은 agy가 받는 단일 완전명으로 해석한다. 이전 `agy models` parser가 저장한 `slug<TAB>표시명` 값은 완전성 판정 전에 첫 열의 canonical slug로 축약해 기존 config도 유효하게 호출한다.
- **agy headless 권한**: cennad 는 비대화형 위임이므로 `flags.skip_permissions` (config 기본 **true**)로 `--dangerously-skip-permissions` 를 부착해 도구를 auto-approve 한다. 미부착 시 agy 1.1.3+ 는 headless `-p` 에서 권한 프롬프트가 필요한 도구(`run_command` 등)를 auto-deny 하고 빈 stdout(exit 0)으로 끝나 모델이 도구를 쓰는 코딩 프롬프트에서 비결정적으로 실패한다. agy 는 자체 scratch 에서 작업하므로 `--dangerously-skip-permissions` 여도 사용자 트리를 오염시키지 않는다.
- agy `--sandbox` 는 `flags.sandbox` 가 true 일 때 부착한다(config 기본 **true**, skip_permissions 와 짝). skip 만 켜고 sandbox 를 끄면 auto-approve 가 unsandboxed 실행까지 무제한 우회하므로, 둘을 함께 켜 auto-approve 를 sandbox 터미널 제약 안에 가둔다. 업스트림 이력·재검증 절차는 레포 루트 `.metadata/cennad/agy-upstream-watch.md`.
- **빈 stdout 복구**: `parseJsonOutput` → null 이면 `resolveTranscript` 가 agy brain transcript 에서 최종 답변을 읽기 전용 복구한다. 완료된 대화는 도구 사용 여부와 무관하게 마지막 `MODEL / PLANNER_RESPONSE / DONE` 이면서 `content` 가 non-empty string 인 엔트리가 답이다 (도구 호출 중간 스텝은 `content` 없이 `thinking`+`tool_calls` 만 담아 자동 제외). 이 경로는 stdout 이 정상이면 발동 하지 않으므로, agy 가 headless 출력을 완전히 고치면 자연 비활성화된다.
- **복구 불가 시 진단**: 복구도 실패하면 `emptyOutputMessage` 가 stderr 를 반영한 `cli_error` 를 만든다. agy 1.1.3+ 는 auto-deny 원인을 stderr 로 안내하므로 (예: "a tool required the command permission ... re-run with --dangerously-skip-permissions") 그대로 노출해 원인을 숨기지 않는다.
- 복구는 읽기 전용이다. agy 의 store·로그·세션 파일을 절대 수정하지 않는다.

## API Contracts

### `resolveTranscript(cwd: string, since: number): Promise<string | null>`

- `callAgy` 가 빈 stdout(`parseJsonOutput` → null) 일 때 fallback 으로 호출한다.
- `cwd` = 세션 격리 cwd (`externalSessionRef`); `since` = spawn 직전 `Date.now()` (freshness 가드).
- 복구한 최종 답변 텍스트 또는 `null` 을 반환한다. 모든 예외는 흡수해 `null`.

### `emptyOutputMessage(stderr: string): string`

- 빈 stdout + 복구 실패의 `cli_error` 문구를 만든다.
- `stderr` 가 non-empty 면 그대로 반영("agy reported: …"), 아니면 버전 무관 힌트.
- soft-deny 는 agy stderr 로 원인이 오므로 사용자가 조치(권한 부여)를 알 수 있다.

### `agyTranscriptStore` — agy 내부 store 어댑터 (격리)

agy 데이터 경로·transcript 스키마 지식을 한 모듈에 가둔다. agy 가 공식 헤드리스 출력 경로(`--output` / `--format json`)를 제공하면 이 모듈만 교체한다.

복구 절차:

1. `~/.gemini/antigravity-cli/cache/last_conversations.json` 에서 `cwd` → conversation id 조회 (`samePath` 로 separator·case 흡수).
2. `~/.gemini/antigravity-cli/brain/<convId>/.system_generated/logs/transcript.jsonl` 의 `mtime ≥ since` 확인 (stale 방지).
3. JSONL 을 줄 단위 파싱, 마지막 `source=MODEL, type=PLANNER_RESPONSE, status=DONE` 이면서 `content` 가 non-empty string 인 엔트리의 `content` 추출. `source=USER` 엔트리를 만나면 후보를 버린다 — agy 는 이번 턴 `USER_INPUT` 을 먼저 append 하므로 그 앞의 DONE 은 이전 턴 답변이고, mtime 만으로는 구분되지 않는다.
4. 어느 단계든 실패하면 `null`.

### Acceptance

- start 빈 stdout + transcript 최종 답변 존재 → 복구 텍스트로 `success` (도구를 쓴 뒤 완료한 대화 포함).
- start 빈 stdout + 답변 미완성(도구 auto-deny) → `cli_error`, 메시지에 stderr 반영.
- resume 이 이번 턴 답변 없이 끝남 + transcript 에는 이전 턴 DONE 만 → 복구하지 않고 실패(낡은 답변을 새 성공으로 돌려주지 않는다).
- 스트림이 `status:"ERROR"` + exit 0 → `findAgyError` 문구로 `cli_error`/해당 코드, transcript 복구 시도 없음.
- `skip_permissions` 기본 true → start/resume argv 에 `--dangerously-skip-permissions` 부착.
- `sandbox: true` 입력이면 argv 에 `--sandbox` 부착.
- resume 은 `--continue` 가 대화에 턴을 추가하므로 재시도 대상이 아니다.

### Caveats

- soft-deny 로 미완성된 대화는 최종 답변 엔트리가 없어 복구 대상이 아니다 (디스크에 답이 없음). `skip_permissions` 기본 true 가 이를 예방한다.
- transcript 경로·스키마는 agy 비문서화 내부 구조(agy 1.1.5 기준)다. 완료 대화의 최종 답은 `PLANNER_RESPONSE.content`(1.1.5 실측). JSONL 폐기(SQLite 전환) 시 복구가 `null` → `cli_error` 로 안전하게 실패한다.
- 멀티바이트 경계 손상이 드물게 남을 수 있다 (빈 응답보다는 우월).

## Acceptance Criteria

### AC-cwd-isolation — 세션 cwd 격리

- 세션마다 `runtime/antigravity-cwd/<sessionId>/` 에서 실행된다.
- 다른 세션의 작업 디렉터리를 공유하지 않는다.

### AC-session-ref-promotion — 대화 참조 승격

- 스트림이 conversation id 를 실어 주면 그것이 `externalSessionRef` 가 된다.
- id 를 못 얻은 세션만 cwd 격리에 기대 재개하고, 이후 어느 턴에서든 id 가 오면 그 자리에서 ref 를 승격한다.

### AC-empty-output-classification — 빈 출력 분류

- 빈 출력이 `cli_error` 로 분류되고 stderr 가 메시지에 반영된다.

### AC-model-name-normalization — 기존 모델 설정 호환

- tier config가 `slug<TAB>표시명`을 담아도 `--model`에는 첫 열의 canonical slug 하나만 전달한다.

## History

- 2026-09-04 — agy 1.1.25의 탭 구분 모델 카탈로그가 그대로 저장된 config를 복구하기 위해 dispatch 경계에서도 canonical slug로 축약하기로 했다.
- 2026-07-23 — agy 1.1.5 headless 권한 auto-deny 대응: `skip_permissions` 기본 true, 빈 출력 `cli_error` 에 stderr 반영, 복구 계약을 "완료 대화의 마지막 `PLANNER_RESPONSE.content`" 로 명문화했다(스키마 드리프트 오해 정정). 배경은 `.metadata/cennad/agy-upstream-watch.md` 참조.

## Last Updated

2026-09-04 — 기존 탭 구분 모델 설정의 dispatch 호환 계약을 추가했다.
