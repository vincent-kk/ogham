## Requirements

- `antigravityDispatcher` 는 `agy -p` (start) / `agy --continue -p` (resume) 를
  세션별 격리 cwd 에서 실행하고 `DispatchResult` 로 정규화한다.
- **agy headless 권한**: cennad 는 비대화형 위임이므로 `flags.skip_permissions`
  (config 기본 **true**)로 `--dangerously-skip-permissions` 를 부착해 도구를
  auto-approve 한다. 미부착 시 agy 1.1.3+ 는 headless `-p` 에서 권한 프롬프트가
  필요한 도구(`run_command` 등)를 auto-deny 하고 빈 stdout(exit 0)으로 끝나
  모델이 도구를 쓰는 코딩 프롬프트에서 비결정적으로 실패한다. agy 는 자체
  scratch 에서 작업하므로 `--dangerously-skip-permissions` 여도 사용자 트리를
  오염시키지 않는다.
- agy `--sandbox` 는 `flags.sandbox` 가 true 일 때 부착한다(config 기본 **true**,
  skip_permissions 와 짝). skip 만 켜고 sandbox 를 끄면 auto-approve 가 unsandboxed
  실행까지 무제한 우회하므로, 둘을 함께 켜 auto-approve 를 sandbox 터미널 제약 안에
  가둔다. 업스트림 이력·재검증 절차는 레포 루트 `.metadata/cennad/agy-upstream-watch.md`.
- **빈 stdout 복구**: `parseJsonOutput` → null 이면 `resolveTranscript` 가 agy
  brain transcript 에서 최종 답변을 읽기 전용 복구한다. 완료된 대화는 도구 사용
  여부와 무관하게 마지막 `MODEL / PLANNER_RESPONSE / DONE` 이면서 `content` 가
  non-empty string 인 엔트리가 답이다 (도구 호출 중간 스텝은 `content` 없이
  `thinking`+`tool_calls` 만 담아 자동 제외). 이 경로는 stdout 이 정상이면 발동
  하지 않으므로, agy 가 headless 출력을 완전히 고치면 자연 비활성화된다.
- **복구 불가 시 진단**: 복구도 실패하면 `emptyOutputMessage` 가 stderr 를 반영한
  `cli_error` 를 만든다. agy 1.1.3+ 는 auto-deny 원인을 stderr 로 안내하므로
  (예: "a tool required the command permission ... re-run with
  --dangerously-skip-permissions") 그대로 노출해 원인을 숨기지 않는다.
- 복구는 읽기 전용이다. agy 의 store·로그·세션 파일을 절대 수정하지 않는다.

## API Contracts

### `resolveTranscript(cwd: string, since: number): Promise<string | null>`

- `callAgy` 가 빈 stdout(`parseJsonOutput` → null) 일 때 fallback 으로 호출한다.
- `cwd` = 세션 격리 cwd (`externalSessionRef`); `since` = spawn 직전
  `Date.now()` (freshness 가드).
- 복구한 최종 답변 텍스트 또는 `null` 을 반환한다. 모든 예외는 흡수해 `null`.

### `emptyOutputMessage(stderr: string): string`

- 빈 stdout + 복구 실패의 `cli_error` 문구를 만든다.
- `stderr` 가 non-empty 면 그대로 반영("agy reported: …"), 아니면 버전 무관 힌트.
- soft-deny 는 agy stderr 로 원인이 오므로 사용자가 조치(권한 부여)를 알 수 있다.

### `agyTranscriptStore` — agy 내부 store 어댑터 (격리)

agy 데이터 경로·transcript 스키마 지식을 한 모듈에 가둔다. agy 가 공식 헤드리스
출력 경로(`--output` / `--format json`)를 제공하면 이 모듈만 교체한다.

복구 절차:

1. `~/.gemini/antigravity-cli/cache/last_conversations.json` 에서 `cwd` →
   conversation id 조회 (`samePath` 로 separator·case 흡수).
2. `~/.gemini/antigravity-cli/brain/<convId>/.system_generated/logs/transcript.jsonl`
   의 `mtime ≥ since` 확인 (stale 방지).
3. JSONL 을 줄 단위 파싱, 마지막 `source=MODEL, type=PLANNER_RESPONSE,
status=DONE` 이면서 `content` 가 non-empty string 인 엔트리의 `content` 추출.
4. 어느 단계든 실패하면 `null`.

### Acceptance

- start 빈 stdout + transcript 최종 답변 존재 → 복구 텍스트로 `success`
  (도구를 쓴 뒤 완료한 대화 포함).
- start 빈 stdout + 답변 미완성(도구 auto-deny) → `cli_error`, 메시지에 stderr 반영.
- `skip_permissions` 기본 true → start/resume argv 에
  `--dangerously-skip-permissions` 부착.
- `sandbox: true` 입력이면 argv 에 `--sandbox` 부착.
- resume 은 `--continue` 가 대화에 턴을 추가하므로 재시도 대상이 아니다.

### Caveats

- soft-deny 로 미완성된 대화는 최종 답변 엔트리가 없어 복구 대상이 아니다
  (디스크에 답이 없음). `skip_permissions` 기본 true 가 이를 예방한다.
- transcript 경로·스키마는 agy 비문서화 내부 구조(agy 1.1.5 기준)다. 완료 대화의
  최종 답은 `PLANNER_RESPONSE.content`(1.1.5 실측). JSONL 폐기(SQLite 전환) 시
  복구가 `null` → `cli_error` 로 안전하게 실패한다.
- 멀티바이트 경계 손상이 드물게 남을 수 있다 (빈 응답보다는 우월).

## Last Updated

2026-07-23 — agy 1.1.5 headless 권한 auto-deny 대응: `skip_permissions` 기본 true,
빈 출력 `cli_error` 에 stderr 반영, 복구 계약을 "완료 대화의 마지막
`PLANNER_RESPONSE.content`" 로 명문화(스키마 드리프트 오해 정정).
`.metadata/cennad/agy-upstream-watch.md` 참조.
