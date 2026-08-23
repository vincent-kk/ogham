# Codex Hook Normalization Contract

## Requirements

- 공식 `apply_patch` command의 모든 add/update/delete section을 입력 순서대로 보존하며, bodyless Add도 빈 파일 operation으로 유지한다.
- Begin 직후의 선택적 non-empty Environment ID preamble과 update의 implicit/explicit hunk, header, context prefix, `*** End of File` 전이를 공식 host와 같은 의미로 해석한다.
- update의 `hunks`는 header와 ` `·`+`·`-` prefix가 붙은 line 순서를 보존하고, `addedLines`·`removedLines`는 이 구조에서 파생된 호환 필드로 유지한다.
- 부분 parse는 성공이 아니다. envelope, command 또는 section 하나라도 불완전하면 전체 결과가 실패다.
- Claude·MCP·agy 입력과 기존 단일 파일 및 Bash read 의미는 batch API 도입 뒤에도 유지한다.

## API Contracts

Move는 source `Delete`와 destination `Write`의 경로 효과를 유지하되 두 연산에 동일한 typed provenance를 싣는다. destination `Write.content`는 patch delta가 아니라 완전한 대상 내용일 때만 존재한다. 모든 logical operation은 앞선 physical section이 touch한 경로를 입력 순서대로 보존하고 filesystem 동일성 판정은 소비자에게 맡긴다.

`ApplyPatchOp.hunks`는 각 hunk의 header와 prefix/text line을 순서대로 제공하며, implicit hunk는 빈 header 하나로 표현한다. Move provenance는 이 구조를 readonly로 전달한다.

`projectApplyPatchHunks(current, hunks)`는 filesystem을 읽지 않고 hunk를 순서대로 투영한다. 각 before-image가 cursor 이후에 정확히 한 번 있으면 `exact`와 전체 content를 반환하고, 없으면 `stale-source`, 둘 이상이면 `ambiguous`와 0-based hunk index를 반환한다. non-empty header는 cursor 이후에서 header 문자열을 포함하는 첫 line부터 검색하게 하며, 결과는 source의 trailing newline을 보존한다.

성공한 parser 결과의 `operations`와 성공한 normalizer 결과의 `toolUses`는 타입 수준에서도 non-empty tuple이다. `NormalizedCodexToolUse<T>`는 union 각 member에 distributive하게 적용되어 discriminant와 member별 sibling 필드를 유지하면서 변경되는 `tool_name`과 `tool_input`을 입력 literal subtype에서 분리한다.

`normalizeCodexToolUses(input)`은 원래 입력을 `original`에 보존한다. 올바른 patch는 각 파일 section을 독립 hook 입력으로 만들고, 실패는 `reason`을 가진 `ok: false`로 돌려준다. Update section의 단일 non-empty `*** Move to:`는 source `Delete` 다음 destination `Write`로 펼쳐 양쪽 경로를 guard한다.

## Acceptance Criteria

### CHN-BATCH — Ordered complete normalization

- Move의 두 연산은 source·destination·role·hunk header/context/prefix와 파생된 추가/제거 line provenance를 보존하며, destination의 부분 내용은 `Write.content`에 넣지 않는다.
- 앞선 update 또는 Move가 touch한 source·destination 경로는 후속 logical operation의 prior-path provenance에 남는다.

- update/add/delete가 섞인 patch는 같은 순서의 `Edit`/`Write`/`Delete` 세 연산이 된다.
- LF와 CRLF 입력은 동일하며 각 연산은 정확한 target path와 원래 sibling 필드를 보존한다.
- 단일 add/update와 Bash 단순 read는 기존 의미를 유지한다.
- non-empty Environment ID가 있는 유효 patch와 unprefixed empty context line이 있는 update도 같은 연산 결과를 만든다.
- bodyless Add는 빈 `addedLines`를 가진 한 operation이고, context-only update와 EOF 뒤 새 non-empty hunk도 유효하다.
- Move update는 source `Delete`와 destination `Write` 두 연산이 이 순서로 생성되며, 빈 destination·중복 Move·Add/Delete section의 Move는 실패한다.

### CHN-UNKNOWN — Conservative malformed result

- command 누락·비문자열, 깨진 envelope, 빈 target, 빈·중복·후위 Environment ID, 미인식 또는 후속 malformed section, 빈 explicit hunk, EOF 뒤 무표식 body, 잘못된 hunk header와 malformed Move는 전체 실패다. malformed Move는 빈 destination, 한 section의 중복 `*** Move to:`, Add/Delete section 안의 Move다.
- body 없는 Delete는 유효하고 성공 결과가 빈 배열인 경우는 없다.

### CHN-PASSTHROUGH — Host-neutral identity

- patch-looking command가 있어도 다른 tool name이면 파싱하지 않는다.
- Claude `Write`/`Edit`와 그 sibling 필드는 동일 객체로 통과한다.

## Last Updated

2026-08-24 — Move hunk provenance와 순수 sequential projection 계약을 추가하고 malformed Move 실패 범위를 명확히 했다.
