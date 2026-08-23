## Purpose

Codex의 공식 hook 입력을 Claude 계열 guard가 이해하는 host-neutral 도구 호출로 순수 정규화하고, 보존한 update hunk를 현재 내용에 투영한다. 파일 I/O나 host 추측 없이 경계 검사가 동일한 물리 호출의 모든 논리 연산을 보게 하는 것이 이 fractal의 책임이다.

## Conventions

- `tool_name="apply_patch"`와 문자열 `tool_input.command` 조합만 V4A patch로 해석한다.
- Begin 직후의 선택적 non-empty `*** Environment ID:` preamble은 metadata로 소비하고 file operation에는 포함하지 않는다.
- 성공한 patch는 입력 순서의 non-empty 연산 목록이며 add/update/delete는 각각 `Write`/`Edit`/`Delete`가 된다.
- hunk header는 현재 cursor 이후에서 header 문자열을 포함하는 첫 line으로 탐색 범위를 좁힌다.
- 단순 Bash 파일 읽기만 `Read`로 바꾸고, 그 밖의 도구 호출은 같은 객체로 통과시킨다.
- 정규화된 연산은 원래 호출의 command와 sibling 필드를 보존한다.

## Boundaries

### Always do

- Move는 source·destination과 hunk header/context/prefix provenance를 보존하고, 순수 투영 결과를 exact·stale-source·ambiguous로 구분한다.
- 각 patch operation은 앞선 physical section이 touch한 원문 경로를 보존해 소비자가 filesystem 기준 stale 여부를 판정할 수 있게 한다.

- envelope와 모든 section을 끝까지 검증하고 하나라도 불완전하면 판별 가능한 실패를 반환한다.
- update는 host-valid implicit/explicit hunk를 구분하고, 빈 explicit hunk와 `*** End of File` 뒤의 무표식 body를 거부한다.
- CRLF와 LF patch에서 같은 연산 순서와 내용을 만든다.
- 소비자가 프로젝트별 범위와 deny 정책을 결정하도록 파싱 결과만 제공한다.

- `*** Move to:`는 source `Delete`와 destination `Write` 두 논리 연산으로 표현해 양쪽 경로를 모두 guard한다.

### Ask first

- 복합 shell 표현을 `Read`로 승격하거나 patch 이외의 도구 신호를 추측한다.

### Never do

- 파싱 실패를 성공한 빈 연산 목록으로 바꾼다.
- 빈·중복·후위 Environment ID나 `@@` prefix만 닮은 hunk를 유효하다고 추측한다.
- 이 모듈에서 파일·프로세스 I/O 또는 환경 변수를 읽는다.
- Codex 전용 정규화를 소비 플러그인에 중복 구현한다.
