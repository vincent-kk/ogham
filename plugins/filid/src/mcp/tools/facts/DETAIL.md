# facts — Contract

## Requirements

- `status`는 `{ projectState, resolutionEpoch, missing[], needsResolution[], uncertain[], toolError[], rejected[], unadjudicated[], outputRequirement }`를 돌려준다. 프로젝트를 바꾸지 않는다.
- `submit { file, resolutionEpoch }`의 epoch 검사는 호출 전체에 대해 all-or-nothing이다. 전달된 epoch가 현재와 다르면 아무것도 저장하지 않고 `facts-epoch-moved`, 새 epoch, `added[]`·`removed[]`·바뀐 해석 입력을 돌려준다.
- epoch가 맞으면 레코드마다 §4.1–4.3을 검사해 통과한 것으로 그 파일의 레코드를 교체하고, 거부된 레코드·참조를 `rejected[]`로 돌려준다.
- 같은 epoch 안에서 `submit`을 여러 번 호출할 수 있고, 각 호출은 자기가 실은 파일의 레코드만 교체한다. 상한을 넘는 파일은 `facts-file-too-large`와 함께 분할 제출을 안내한다.
- `file`은 절대 경로이고 **정규화한 실제 위치**가 프로젝트 트리 밖이어야 하며, 일반 파일이고 크기 상한 안이어야 한다. JSON으로만 해석한다. 경로를 먼저 정규화하므로 프로젝트 밖으로 이어지는 symlink 경로(에이전트의 `$TMPDIR`이 흔히 그렇다)는 통과하고 안으로 이어지는 symlink는 거절된다.
- schema 오류는 JSON pointer만 말한다. 값도, 그 항목이 주장한 `path`도 돌려주지 않는다 — schema를 벗어난 항목은 사실 레코드라는 보장이 없으므로 어느 필드를 되돌려 줘도 임의 파일의 읽기 통로가 된다.
- JSON 파싱 오류 메시지는 원문 조각을 싣지 않는다.
- 범위가 선언되지 않은 프로젝트에는 두 action 모두 `unsupported`와 `facts-uninitialized`를 돌려준다.
- 서버는 어떤 명령도 실행하지 않는다.
- 두 action의 스캔은 `core/tree/fractalTree`의 `scanFileSetOptions`를 쓴다. 그것이 snapshot과 같은 파일 집합을 보기 위한 단일 정본이다. 기본 옵션을 쓰면 깊이 10을 넘는 파일이 snapshot에는 있고 facts 범위에는 없게 된다.
- 레코드가 선언한 해석 입력은 제출 때 현재 hash와 대조하고, 어긋나면 그 레코드를 거부한다. 거부는 두 가지로 나뉜다 — 내용이 달라진 것(`stale`, 재추출)과 서버가 읽지 못하는 것(`unreadable`, 재추출로는 풀리지 않으므로 선언 제거·권한·attested). 어느 입력이 왜 걸렸는지는 경로와 사유 code로만 돌려주고 내용은 돌려주지 않는다. 선언 입력은 프로젝트 epoch에 들어가지 않으므로 한 배치를 받아들여도 다음 배치의 epoch는 움직이지 않는다 — 분할 제출이 성립하는 이유다.

## API Contracts

- `handleFacts(input): Promise<FactsResult>` — `action`이 handler를 고른다.
- `status` 요약은 상태별 개수를, `data`는 상태별 경로 목록과 생략된 개수(`truncated`)를 싣는다. 한 번도 제출하지 않은 저장소는 스캔된 모든 파일이 `missing`이므로 상한이 곧 응답 크기의 상한이다.
- `submit` 요약은 `accepted`·`removed`·`rejectedRecords`·`rejectedClaims`·`epochMoved`를, `data`는 거부 목록과 epoch 차이를 싣는다.
- 신뢰 경계 오류는 `ToolDiagnosticError`로 던져 공통 error envelope를 탄다: `facts-file-path-not-absolute`, `facts-file-inside-project`, `facts-file-not-regular`, `facts-file-too-large`, `facts-file-unreadable`, `facts-file-not-json`.
- 저장 도중 다른 writer가 같은 레코드를 바꾸면 그 레코드는 저장되지 않고 `facts-record-changed` 진단 하나가 실리며 status는 `indeterminate`다.

## Design Decisions

- **서버는 출력 디렉터리를 권하지 않는다.** 측정: 서버의 `os.tmpdir()`는 샌드박스 에이전트가 쓸 수 없다 — 서버는 에이전트의 샌드박스 밖에서 돈다. 경로를 권하면 에이전트가 못 쓰는 곳을 가리키게 된다. `outputRequirement`는 조건을 말하는 고정 문장이고, 판정은 에이전트가 준 경로에 한다.
- **CAS 단위는 shard다.** 레코드 단위 CAS는 레코드마다 파일을 열어야 하고, 그 열기가 저장소 읽기 비용의 72%였다. 충돌은 그 shard를 함께 쓰려던 레코드들에 걸리고, 복구는 어느 단위든 같은 "status 뒤 재제출"이다. 한 배치는 touch한 shard마다 정확히 한 번 쓴다.
- **epoch 검사는 제출 파일을 연 뒤에 한다.** 순서를 뒤집으면 경로 가드를 통과하지 못하는 인자가 epoch 메시지 뒤에 숨어, 호출자가 epoch를 맞춘 뒤에야 진짜 문제를 보게 된다.
- **CAS 실패는 던지지 않고 진단으로 싣는다.** 이미 저장된 레코드가 있는 채로 예외를 던지면 응답이 실제로 일어난 일을 말하지 못한다. 교체 의미론에서 재제출은 안전하므로 다음 행동은 `status` 뒤 재제출이다.

## Acceptance Criteria

### AC-facts-tool-status — 상태 보고

- 범위 선언이 없으면 `unsupported`와 `facts-uninitialized`이고 목록은 비어 있다.
- 제출이 없는 프로젝트의 모든 범위 내 파일은 `missing`이며, 목록은 상한까지만 싣고 나머지는 `truncated`로 센다.

### AC-facts-tool-submit — 제출

- epoch가 다르면 어떤 레코드도 저장되지 않고 새 epoch와 경로 차이가 실린다.
- 검사를 통과한 레코드만 저장되고, 거부된 레코드·참조는 JSON pointer와 함께 실린다.
- 범위에서 빠지거나 트리에서 사라진 파일의 레코드는 같은 호출에서 지워진다.

### AC-facts-tool-scope — snapshot과 같은 파일 집합

- 깊이 10을 넘는 파일도 범위에 들어간다.
- `structure.additionalExcludedDirectories`가 지정한 디렉터리의 파일은 범위에서 빠진다.

### AC-facts-tool-liveness — 서버는 멈추지 않는다

- FIFO를 `file`로 주면 `facts-file-not-regular`로 즉시 돌아온다.
- FIFO를 해석 입력으로 선언한 레코드는 거부되고, 그런 레코드가 이미 저장돼 있어도 `status`는 돌아온다.

### AC-facts-tool-boundary — 신뢰 경계

- 프로젝트 안으로 해석되는 경로, 상한 초과, 비-JSON, 일반 파일이 아닌 것, 호스트가 거부하는 경로는 각각 자기 코드로 거절된다.
- 프로젝트 밖으로 해석되는 symlink 경로는 받아들인다.
- 비-JSON 파일의 내용은 응답 직렬화 어디에도 나타나지 않는다.

## Last Updated

2026-09-20 — `facts` 도구의 `status`·`submit` 최초 계약. 독립 검토를 반영해 제출 경로를 먼저 정규화하고, 권장 디렉터리를 요구 문장으로 바꾸고, CAS를 shard 단위로 옮겼다.
