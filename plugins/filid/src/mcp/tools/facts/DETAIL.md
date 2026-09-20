# facts — Contract

## Requirements

- `status`는 `{ projectState, resolutionEpoch, missing[], needsResolution[], uncertain[], toolError[], rejected[], unadjudicated[], outputRequirement }`를 돌려준다. 프로젝트를 바꾸지 않는다.
- `status`의 `rejected`도 **항목 단위**다: 거부된 claim마다 `path`·`code`·`nextAction`과, 있으면 `specifier`·`inputPath`·`lines`. 이전 `submit` 응답을 보지 못한 세션이 **왜** 거부됐는지 알 수 있어야 하기 때문이다 — 내용 기반 거부(`facts-reference-absent` 등)는 같은 도구로 다시 추출하면 같은 거부가 돌아오므로, 경로만 주면 한 바퀴를 헛돈 뒤에야 알게 된다. 파일 내용은 싣지 않는다(경로·호출자가 보낸 specifier·줄 번호뿐). 다음 행동 문장은 저장하지 않고 **code에서 조회**한다 — 문구를 고치면 옛 레코드가 옛말을 하지 않도록.
- `uncertain`인 파일은 **언제나 이유와 함께 나타난다.** 이유 목록은 `rejected`(거부된 claim), `indeterminate`(공급자가 보증하지 못한 참조), `unadjudicated`(열린 항목), `pendingAttestations`(확인 대기), `awaitingComparison`(판정이 손상으로 폐기돼 아직 아무도 다시 도출하지 않은 파일)이고, 목록이 아니라 진단으로 오는 이유가 하나 더 있다 — `facts-judgements-unreadable`이 붙들고 있는 파일은 어느 목록에도 없다(읽히지 않은 것이 바로 그 파일들을 이름 지어 줄 것이었기 때문이다). 이유 없이 `uncertain`으로만 실리는 파일은 다음 행동이 없는 정지이므로, 그 목록들과 그 진단의 합집합이 `uncertain`을 덮는지 테스트가 고정한다. **개수로 세지 않고 이름으로 적는다** — 이유가 하나 늘 때 조용히 어긋나는 것이 수를 적은 문장이다.
- `awaitingComparison`의 항목은 `path`와, 있으면 저장된 레코드의 `storedTool`을 싣는다. 표시를 지우는 `compare`는 **그 도구가 아닌** 출처여야 하므로, 그 값이 응답에 없으면 호출자가 무엇을 피해야 하는지 알 수 없어 다음 행동이 추측이 된다(P5).
- `status`의 `unadjudicated[]`는 **항목 단위**다. 열린 항목마다 `adjudicate`가 요구하는 값 전부(`path`·`kind`·`reference`·`resolvedPath`·현재 `contentHash`)와 판단에 필요한 값(`origin`·`state`·`lines`·`staleUnderNewContent`, 확인 대기 중인 `actor`·`reason`)을 싣는다. 경로만 주면 호출자가 key를 추측하게 되고, 추측은 `facts-adjudication-no-such-item`으로 거절되며, 그 거절의 다음 행동이 다시 같은 목록을 가리켜 루프가 된다(P5). 부트스트랩(§8a)의 `status → adjudicate`가 성립하는 지점이다.
- 열린 항목 목록에는 **판정할 수 있는 것만** 싣는다. 트리·범위를 벗어난 파일, 읽을 수 없는 파일, 그리고 판정 대상 줄이 바뀌어 만료한 항목은 `adjudicate`가 받지 않으므로 목록에서 뺀다. `status`는 읽기 전용이므로 만료 항목을 지우지는 않는다 — 다음 쓰기 action이 지운다.
- `submit { file, resolutionEpoch }`의 epoch 검사는 호출 전체에 대해 all-or-nothing이다. 전달된 epoch가 현재와 다르면 아무것도 저장하지 않고 `facts-epoch-moved`, 새 epoch, `added[]`·`removed[]`·바뀐 해석 입력을 돌려준다.
  - `added[]`·`removed[]`의 기준선은 저장된 epoch snapshot이고, 그것은 **트리가 멈춰 있는 동안**(저장된 epoch가 이번 호출의 epoch와 같을 때)과 **epoch 검사를 통과한 submit에서** 쓰인다. 뒤쪽은 수락 여부와 무관하다 — 전달된 epoch가 현재와 같다는 것 자체가 그 호출자가 이 트리를 읽었다는 증거이고, 거기서부터가 그 호출자가 아직 모르는 변화다. drift 계수만 수락이 있을 때 초기화한다. 트리가 움직인 뒤 덮어쓰면, 옛 epoch을 들고 오는 호출자에게 빈 목록을 답하게 된다 — `facts-tree-unstable`의 다음 행동이 "added와 removed 경로로 무엇이 쓰는지 찾아라"이므로 그 목록이 비면 가리킬 것이 없다. 스냅숏은 힌트이므로 없거나 손상되면 빈 목록으로 답하고 거부 자체는 그대로 성립한다.
- epoch가 맞으면 레코드마다 §4.1–4.3을 검사해 통과한 것으로 그 파일의 레코드를 교체하고, 거부된 레코드·참조를 `rejected[]`로 돌려준다.
- 같은 epoch 안에서 `submit`을 여러 번 호출할 수 있고, 각 호출은 자기가 실은 파일의 레코드만 교체한다. 상한을 넘는 파일은 `facts-file-too-large`와 함께 분할 제출을 안내한다.
- 축소 탐지의 두 개수 — 파일에 남은 출현 수와 이전 레코드의 주장 수 — 는 `toolError` 레코드를 그 레코드의 빈 `references`가 아니라 보존된 `shrinkBaseline`으로 읽는다. 빈 배열로 세면 이전 주장 수가 모든 문자열에 대해 0이라 재지정(`resolution-changed`)이 언제나 "개수가 달라졌으니 평범한 편집"으로 빠져나가고, 출현 수는 기준선이 적어 둔 `sourceText` 철자를 잃어 `specifier` 철자로 세어져 0이 된다. 즉 `toolError` 레코드 하나를 끼워 넣는 것이 §2.4의 기준선 보존을 무력화하는 길이 된다.
- `file`은 절대 경로이고 **정규화한 실제 위치**가 프로젝트 트리 밖이어야 하며, 일반 파일이고 크기 상한 안이어야 한다. JSON으로만 해석한다. 경로를 먼저 정규화하므로 프로젝트 밖으로 이어지는 symlink 경로(에이전트의 `$TMPDIR`이 흔히 그렇다)는 통과하고 안으로 이어지는 symlink는 거절된다.
- schema 오류는 JSON pointer만 말한다. 값도, 그 항목이 주장한 `path`도 돌려주지 않는다 — schema를 벗어난 항목은 사실 레코드라는 보장이 없으므로 어느 필드를 되돌려 줘도 임의 파일의 읽기 통로가 된다.
- JSON 파싱 오류 메시지는 원문 조각을 싣지 않는다.
- 범위가 선언되지 않은 프로젝트에는 두 action 모두 `unsupported`와 `facts-uninitialized`를 돌려준다.
- 서버는 어떤 명령도 실행하지 않는다.
- 두 action의 스캔은 `core/tree/fractalTree`의 `scanFileSetOptions`를 쓴다. 그것이 snapshot과 같은 파일 집합을 보기 위한 단일 정본이다. 기본 옵션을 쓰면 깊이 10을 넘는 파일이 snapshot에는 있고 facts 범위에는 없게 된다.
- 레코드가 선언한 해석 입력은 제출 때 현재 hash와 대조하고, 어긋나면 그 레코드를 거부한다. 거부는 두 가지로 나뉜다 — 내용이 달라진 것(`stale`, 재추출)과 서버가 읽지 못하는 것(`unreadable`, 재추출로는 풀리지 않으므로 선언 제거·권한·attested). 어느 입력이 왜 걸렸는지는 경로와 사유 code로만 돌려주고 내용은 돌려주지 않는다. 선언 입력은 프로젝트 epoch에 들어가지 않으므로 한 배치를 받아들여도 다음 배치의 epoch는 움직이지 않는다 — 분할 제출이 성립하는 이유다.

- `compare { file, generationId? }`는 후보를 **레코드로 저장하지 않고** 비교한다. 프로젝트 안 경로로 해석된 불일치만 부속 표에 미판정 항목으로 남고, 그 밖의 차이는 `informational[]`에만 실려 파일 상태를 바꾸지 않는다. 응답의 `sideTableItems[]`는 비교한 파일의 페이지 **전체**를 `status`와 같은 모양으로 싣는다 — 이번 비교가 만든 차이만 실으면 다른 제출이 연 항목이 보이지 않고, 보이지 않는 항목은 판정할 수 없다. `generationId`가 오면 기준선이 **live 저장소가 아니라 그 generation이 동결한 사실**이다(스펙 §9): verifier는 리뷰가 판단한 것과 후보를 견주는 것이고, 리뷰가 보지 못한 사실로 막히면 안 된다. 동결본은 digest 검증을 거쳐 읽는다(누가 고친 `facts.json`은 없는 것으로 읽힌다). **generation 디렉터리가 남아 있으면 옛 generation도 자기 동결본으로 답한다** — `facts.json`과 그 digest를 든 state 스냅숏이 그 디렉터리 안에 함께 있기 때문이다. 동결본이 없거나 쓸 수 없으면 종전대로 "그 generation에 동결된 사실이 없다" 코드로 답한다. **`generationId`의 모양은 경로가 되기 전에 검사한다**(32 hex): 경계를 벗어나는 값은 containment 가드에서 예외로 끝나거나 "동결된 사실이 없다"로 답해 저장소가 찾아본 것처럼 읽힌다 — 둘 다 에이전트가 고칠 수 있는 답이 아니다. 모양이 아니면 `facts-generation-id-invalid`로 거절하고 다음 행동을 싣는다. 동결본은 digest뿐 아니라 **스키마로도 파싱**한다 — digest는 bytes가 그 bytes임을 말할 뿐 모양을 증명하지 않고, state와 facts는 같은 트리에 있어 함께 고쳐질 수 있다. 어느 경우든 불일치 항목은 **live 부속 표**에 남는다(§4.5).
- `adjudicate { sourcePath, contentHash, actor, items }`는 호출 전체를 파일 byte에 묶는다. `contentHash`가 현재와 다르면 아무것도 판정하지 않는다(`facts-adjudication-stale-content`). `actor`가 접기 뒤 비면 그것도 호출 전체를 거부하지만 **다른 코드**를 쓴다(`facts-adjudication-actor-required`) — byte를 다시 읽으라는 다음 행동은 actor가 빈 호출을 고치지 못하므로 그 거부를 스스로 재생산한다. 항목 하나가 표에 없거나 이유 없는 `dismiss`이면 그 항목만 거부하고 나머지는 적용한다.
- 이번 호출이 **판정한** 항목만 현재 `contentHash`로 다시 각인한다. 아무도 다시 읽지 않은 항목의 `staleUnderNewContent`까지 지우면 일어나지 않은 재확인을 주장하게 된다.
- `compare`의 `file`은 `submit`의 `file`과 **같은 가드**를 지난다(정규화 → 보호된 열기 → 프로젝트 밖 · 일반 파일 · 상한).

- `provenance.tier: 'attested'` 레코드는 §4.1–4.3을 통과한 뒤 두 관문을 더 지난다. **계정**: 참조 패턴에 걸리는 모든 줄이 레코드의 참조나 `nonReferences`로 설명돼야 하고, 아니면 그 레코드는 저장되지 않고 `unaccountedLines`(줄 번호)와 함께 거부된다. **확인**: 첫 제출은 pending으로 남고 파일은 `uncertain`이며, **다른 actor**의 두 번째 독립 제출이 같은 간선 집합을 낼 때 비로소 레코드가 저장된다.
- 확정된 attested 레코드가 빼는 간선 중 **두 제출 모두가 `nonReferences`로 설명한 줄의 것**은 항목을 열지 않고 `dismissed`로 바로 기록한다. 요약의 `attestationDismissals`가 그 개수다.
- 불일치한 두 번째 제출은 **아무것도 저장하지 않고 pending도 바꾸지 않는다.** 응답은 어느 간선이 어느 쪽에만 있는지를 줄 번호와 함께 돌려준다. 같은 actor의 재제출도 확인이 아니며 상태를 바꾸지 않는다.
- `discard-damaged { shards }`는 **JSON이 깨진 판정 shard**(부속 표·pending)를 비운다. 다른 모든 쓰기는
  불일치가 탐지된 자리에서만 일어나고 깨진 shard가 들고 있는 불일치가 바로 아무도 읽을 수 없는 것이므로,
  이 호출이 없으면 그 shard가 덮는 파일들은 영원히 `uncertain`이다 — `discard-pending`과 같은 성격의
  **P5 구성 요소**다. 지금 `unparseable`인 shard만 받고 읽히는 shard는 이름으로 거절한다(답하기 싫은 판정을
  지우는 길이 되면 안 된다). 손상 shard 자신의 digest를 CAS로 들고 가고, 응답에 지운 shard와 영향 파일 수,
  그리고 "그 파일들을 독립 추출해 `compare`로 항목을 다시 열라"는 다음 행동을 싣는다. **부속 표** shard를
  비울 때는 빈 shard가 아니라 그 shard에 걸리는 범위 안 스캔 경로마다 `awaitingComparison` 표시를 단 빈
  페이지를 쓴다 — 그 파일들은 그때까지 `uncertain`이고, 다음 행동이 권고가 아니라 상태가 된다. pending
  shard에는 표시를 달지 않는다: 확인되지 않은 attested 주장은 합의된 적이 없어 잃어도 간선이 사라지지 않고,
  `discard-pending`이 이미 그것을 지우는 정규 경로다.
- 그래서 **응답은 버린 shard가 어느 저장물의 것이었는지에 따라 다른 사실을 말한다.** 부속 표를 버렸으면
  `facts-judgements-discarded`와 `data.awaitingComparison`을 가리키는 다음 행동이고, pending만 버렸으면
  `facts-pending-attestations-discarded`와 "잃은 것은 확인 전 주장뿐이고 파일은 자기 레코드가 주는 상태로
  돌아간다, `status`를 보라"는 다음 행동이다. 둘을 함께 버렸으면 진단도 둘이다. `affectedFiles`는
  **표시를 단 파일 수**다 — pending 쪽을 함께 세면 비어 있는 목록에서 그 수만큼을 찾게 된다.
- `compare`가 `awaitingComparison` 표시를 지우는 조건은 둘이고, **둘 다** 만족해야 한다. 후보가 저장된
  레코드의 `provenance.tool`과 **다른** 출처이거나 attested일 것 — 같은 도구의 후보는 레코드를 재생산할
  뿐이므로 `facts-comparison-not-independent`로 답한다. 그리고 비교의 기준선이 **live 저장소**일 것
  (`generationId` 없음) — `generationId`가 오면 기준선은 그 generation의 동결본이고, 표시가 뜻하는 손실은
  동결 **이후**에 저장소에서 일어난 것이라 동결본은 그것을 볼 수 없다. 동결본과 후보가 둘 다 잃어버린
  간선을 들고 있으면 차이가 0으로 나오고, 그 0을 근거로 표시를 지우면 표시가 막으려던 바로 그 결과가
  된다. 그 경우는 `facts-comparison-not-against-store`로 사실과 다음 행동(같은 후보 파일로
  `generationId` 없이 다시 `compare`)을 돌려준다. 어느 경우든 비교 자체는 거부하지 않는다 — 그 후보가
  찾은 차이는 여전히 항목이 될 가치가 있고, 지워지지 않는 것은 표시뿐이다.
- `discard-pending { sourcePaths }`는 그 파일들의 pending만 지운다. **저장된 레코드와 부속 표는 건드리지 않으므로 "레코드를 지우는 action"이 아니다.** 두 actor가 영원히 다른 답을 내는 파일의 유일한 출구이고, 그래서 편의가 아니라 **P5의 구성 요소**다. pending이 없는 경로는 거부가 아니라 "이미 그 상태"로 보고한다.
- `status`는 attested가 필요한 파일에 대해 **언제·무엇을·어떤 모양으로** 내야 하는지를 응답만으로 말한다. `attestationRequirement`의 첫 문장이 그 시점을 이름으로 든다 — 도구가 읽지 못한 파일(`tool-error`), 재추출이 같은 거부를 재생산하는 파일(`rejected[]`), 항목을 다 판정하고도 남은 `uncertain`. 이어서: `attestationRequirement`(필수 필드, `nonReferences` 요구, 두 번째 actor)와, pending이 있는 파일마다 그 actor·`contentHash`·다음 행동을 싣는 `pendingAttestations[]`. 에이전트가 skill 문서 없이도 막히지 않아야 한다.

## API Contracts

- `handleFacts(input): Promise<FactsResult>` — `action`이 handler를 고른다.
- `status`는 추출이 필요한 파일(범위 안의 `missing` ∪ `needs-resolution`)의 목록을 서버 cache 디렉터리에 줄 단위로 쓰고 `extractionList: { path, count, unrepresentable }`로 알린다. 에이전트는 그 경로를 추출기의 `--files-from`에 그대로 넘긴다 — 범위를 서버가 정하므로 추출기는 스캔·ignore·scope를 다시 구현하지 않는다.
- `status` 요약은 상태별 개수를, `data`는 상태별 경로 목록과 생략된 개수(`truncated`)를 싣는다. 한 번도 제출하지 않은 저장소는 스캔된 모든 파일이 `missing`이므로 상한이 곧 응답 크기의 상한이다.
- `submit` 요약은 `accepted`·`removed`·`rejectedRecords`·`rejectedClaims`·`epochMoved`·`openedItems`·`closedItems`·`removedAdjudicatedItems`·`attestationsPending`·`attestationsConfirmed`를, `data`는 거부 목록과 epoch 차이, 그리고 attested 레코드마다의 결과(`attested[]`: 결과 종류, 다른 쪽에만 있는 간선, 다음 행동)를 싣는다. 개수는 모두 **실제로 저장된 shard·페이지만** 센다.
- 트리·범위를 벗어난 파일의 표 페이지를 지울 때 그 페이지가 담고 있던 판정(`pending-dismiss`·`adopted`·`dismissed`)의 개수를 `facts-adjudicated-items-removed`로 보고한다. 막지 않는 보고다 — 제거 자체는 옳고 되돌릴 것이 없다. rename은 새 경로의 첫 제출에 비교 대상 레코드가 없어 축소로 잡히지 않으므로, 다음 행동은 새 경로로 `compare`를 한 번 돌리는 것이다.
- 신뢰 경계 오류는 `ToolDiagnosticError`로 던져 공통 error envelope를 탄다: `facts-file-path-not-absolute`, `facts-file-inside-project`, `facts-file-not-regular`, `facts-file-too-large`, `facts-file-unreadable`, `facts-file-not-json`.
- 저장 도중 다른 writer가 같은 레코드를 바꾸면 그 레코드는 저장되지 않고 `facts-record-changed` 진단 하나가 실리며 status는 `indeterminate`다.
- 부속 표 페이지를 빼앗기면 `facts-side-table-changed`이고, 이것도 `indeterminate`다 — 레코드는 들어갔는데 항목이 안 들어간 제출은 항목 없이 좁아진 그래프다. 다음 행동은 **진 action의 일**이다: `submit`은 재제출, `compare`는 같은 후보로 재비교, `adjudicate`는 `status`로 현재 항목을 다시 받아 재판정.
- `submit`의 쓰기는 **실패 방향으로 안전한 순서**를 따른다. 항목을 **여는** 쓰기가 먼저다 — 레코드가 뒤이어 들어가지 못해도 남는 것은 "아직 판정되지 않은 간선"이라 파일이 `uncertain`으로 읽힐 뿐이고, 이는 보수적이다. 여는 페이지가 CAS에 지면 **그 경로의 레코드는 쓰지 않는다**: 좁아진 레코드만 들어가면 재시도가 그 레코드를 자기 자신과 비교해 열 항목이 사라지고 파일이 `exact`로 읽힌다. 그다음이 레코드이고, **닫는** 쓰기(`closed-by-record`, attestation dismissal, 트리를 떠난 파일의 페이지 제거, pending 정리)는 레코드가 실제로 들어간 경로에 대해서만 마지막에 한다 — 없는 레코드가 닫은 항목은 아무도 판정하지 않은 채 사라진 간선이다. 두 쓰기가 같은 shard를 건드리면 두 번째가 첫 번째의 새 token을 이어받는다.

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
