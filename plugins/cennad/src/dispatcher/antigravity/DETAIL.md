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

- transcript 복구는 읽기 전용이며 모든 실패를 `null`로 흡수한다. 비문서화 store 경로·스키마 지식은 전용 어댑터에 가둬 공식 출력으로 대체할 때 수정 범위를 한정한다.
- transcript의 mtime은 호출 시작보다 새로워야 한다. 최신 USER_INPUT 앞의 DONE은 이전 턴 답이므로 인정하지 않는다. mtime만으로는 이번 턴 답인지 구별할 수 없다.
- stdout이 정상일 때 복구를 발동하지 않는다. CLI의 명시적 오류나 취소 후에는 이전 턴 답을 새 성공으로 오인할 수 있어 복구하지 않는다.
- resume은 대화에 턴을 추가하므로 재시도하지 않는다.
- soft-deny로 미완성된 대화는 디스크에 최종 답이 없어 복구할 수 없다. transcript 스키마 변경 시에도 복구 불가로 실패하며 성공을 합성하지 않는다.
- transcript는 비문서화 내부 구조이며 멀티바이트 경계 손상이 남을 수 있다. 이 한계를 감수하는 이유는 빈 응답 대신 완료된 답을 회수하기 위해서다.
- 빈 출력의 최종 진단은 stderr를 보존한다. 권한 soft-deny 원인을 사용자가 조치할 수 있게 하기 위해서다.

## Acceptance Criteria

검증 코드가 수용 기준을 고정하므로 별도 acceptance group을 선언하지 않는다.

## Last Updated

agy 세션 지목·출력 복구·권한 및 시간 제한 계약의 내용이나 적용 범위가 바뀔 때 갱신한다.
