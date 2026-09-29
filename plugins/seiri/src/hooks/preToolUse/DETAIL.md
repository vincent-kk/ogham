# preToolUse — Contract

## Requirements

- standard/strict의 진입 요청은 부재·만료·손상 actor를 payload의 native turn으로 seed한다. 그 외에는 기존 actor anchor와 같은 turn(main은 native turn, 자식은 agent-stable turn)의 Bash 또는 runtime 참여 호출(`step`·`start`·`resume`·`pause`·`finish`)만 관측한다. `dial`은 화이트리스트 밖이라 관측하지 않는다.
- Bash는 active binding이 있을 때만 기록한다. runtime 참여 호출은 validated explicit request만 기록한다.
- 호출 관측은 호스트 호출 ID와 입력 해시를 저장하며 결정·주입을 하지 않는다.
- `Edit`·`Write`·`NotebookEdit`(엔트리가 펼친 Codex `apply_patch` 포함)는 `editNotice`를 거친다. `agent_id`가 있으면 무주입·무상태다. `tool_input.file_path` 또는 `notebook_path`를 `canonicalizeTargetPathSync`로 정규화하고, 같은 방식으로 정규화한 cwd에서 찾은 저장소 루트에 대한 `portableRelative` 경로(구분자 `/`)를 구한다. 저장소 밖(`..` 또는 절대 경로)과 `EDIT_NOTICE_EXCLUDED_PREFIXES`(`.seiri/`) 경로는 무주입이다. 경로 정규화 예외는 그 경로만 무주입으로 끝내고 같은 호출의 다른 안내를 지우지 않는다.
- `observeEdit`는 저장소 상대 경로의 `workflowHash`를 actor의 턴별 `edits`에 기록하고, 활성 바인딩이 없을 때 첫 파일에서 `first`, 서로 다른 파일 수가 `EDIT_NOTICE_FILE_THRESHOLD`(3)에 이를 때 `spread`를 한 번씩 낸다. paused 바인딩은 안내 대상이다.

## API Contracts

- `processToolStart(input, adapter?, now?)`는 native PreToolUse payload를 받고 항상 비차단 결과를 반환한다. 편집 안내가 있을 때만 `hookSpecificOutput.additionalContext`를 담고, 그 외에는 `EMPTY_RESULT`다.
- `editNotice(input, identity, now)`는 안내 한 줄 또는 `undefined`를 반환하며 예외를 던지지 않는다.
- `expandEditInputs(input)`는 `apply_patch`가 아니거나 패치 파싱에 실패하면 `[input]`, 성공하면 `Write`·`Edit` 논리 입력만 순서대로 반환한다(`Delete` 제외, Move는 목적지 `Write`만).
- 엔트리는 펼친 입력마다 `processToolStart`를 적용하고 `additionalContext`를 중복 없이 `\n`으로 이어 한 `HookOutput`으로 출력한다.

## Acceptance Criteria

### AC-pre-provenance — Native pairing

- native ID 부재, 다른 turn, unsupported tool, off/advisory는 상태를 만들지 않는다.
- 중복 호출은 generation 변경을 이용해 재활성화할 수 없다.

### AC-pre-edit-notice — 편집 순간 안내

- standard, 바인딩 없음: 턴 첫 편집은 `First edit this turn`을 내고, 같은 파일 재편집은 무주입이다.
- 같은 턴 서로 다른 파일 3개째는 `3 files edited this turn`을 내고 4개째는 무주입이다. `EDIT_TRACKED_FILES_CAP`를 넘는 파일은 기록되지 않는다.
- 활성 바인딩이 있으면 무주입이며 `edits`를 기록하지 않는다.
- `.seiri/` 아래 경로와 저장소 밖 경로는 무주입이다. symlink cwd, Codex식 cwd 상대 경로, 아직 없는 새 파일은 안내한다.
- off/advisory는 무주입이며 `.seiri/sessions`를 만들지 않는다. `agent_id`가 있는 편집은 무주입이며 자식 actor 파일을 만들지 않는다.
- 새 턴(UserPromptSubmit)은 `edits`를 지워 같은 파일 편집이 다시 `First edit`가 된다.
- Codex `apply_patch` 한 호출이 3파일을 고치면 first와 spread가 한 출력으로 나가고, Claude `Edit` 3회와 같은 두 안내가 관측된다.

## Last Updated

2026-09-29
