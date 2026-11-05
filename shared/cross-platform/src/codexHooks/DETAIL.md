# Codex Hook Normalization Contract

## Requirements

- 공식 `apply_patch` command의 모든 add/update/delete section을 입력 순서대로 보존하며, bodyless Add도 빈 파일 operation으로 유지한다.
- Begin 직후의 선택적 non-empty Environment ID preamble과 update의 implicit/explicit hunk, header, context prefix, `*** End of File` 전이를 공식 host와 같은 의미로 해석한다.
- update의 `hunks`는 header와 ` `·`+`·`-` prefix가 붙은 line 순서를 보존하고, `addedLines`·`removedLines`는 이 구조에서 파생된 호환 필드로 유지한다.
- 부분 parse는 성공이 아니다. envelope, command 또는 section 하나라도 불완전하면 전체 결과가 실패다.
- Claude·MCP·agy 입력과 기존 단일 파일 및 Bash read 의미는 다중 연산에서도 유지한다.

## API Contracts

Move는 source `Delete`와 destination `Write`의 경로 효과를 유지하되 두 연산에 동일한 typed provenance를 싣는다. destination `Write.content`는 patch delta가 아니라 완전한 대상 내용일 때만 존재한다. 모든 logical operation은 앞선 physical section이 touch한 경로를 입력 순서대로 보존하고 filesystem 동일성 판정은 소비자에게 맡긴다.

순수 투영은 파일 시스템을 읽지 않는다. 현재 내용과 hunk의 일치가 없거나 모호하면 성공으로 추측하지 않으며, 구체적인 탐색·개행 결과는 투영 테스트에서 확인한다.

성공한 parser 결과의 `operations`와 성공한 normalizer 결과의 `toolUses`는 타입 수준에서도 non-empty tuple이다. `NormalizedCodexToolUse<T>`는 union 각 member에 distributive하게 적용되어 discriminant와 member별 sibling 필드를 유지하면서 변경되는 `tool_name`과 `tool_input`을 입력 literal subtype에서 분리한다.

`normalizeCodexToolUses(input)`은 원래 입력을 `original`에 보존한다. 올바른 patch는 각 파일 section을 독립 hook 입력으로 만들고, 실패는 `reason`을 가진 `ok: false`로 돌려준다. Update section의 단일 non-empty `*** Move to:`는 source `Delete` 다음 destination `Write`로 펼쳐 양쪽 경로를 guard한다.

## Boundary Exemptions

### `hunkProjection` — 패키지 루트 공개 재노출

- **Consumers**: `../index.ts`
- **Direct import**: `allowed`
- **Reason**: 상위 `src` 계약이 패키지 루트 배럴에서 공개 심볼의 구체 소유 파일을 이름으로 재노출하도록 요구하며, 이 경로는 구현 소비가 아니라 패키지 공개 표면 열거다.

## Acceptance Criteria

동작별 결과는 테스트가 고정하며, 정책과 경계 보장은 위 계약을 따른다.

## Last Updated

patch 완전성·Move provenance 또는 순수 투영의 보장 범위가 바뀔 때 갱신한다.
