# lensStatus — Contract

## Requirements

- `@ogham/maencof` 의 `handleKgStatus` 결과 위에 lens 고유 필드를 얹는다. 노드 수·건강 상태 집계를 여기서 다시 계산하지 않는다.
- 만료 판정은 `vault/staleDetector` 의 `detectStale` 한 경로만 쓴다. 마커 mtime 비교를 이 fractal 에서 재구현하지 않는다.
- 만료 종류를 뭉뚱그리지 않는다. `markerKind === "legacy"` 는 v1 스키마 마이그레이션이 필요하다는 문장으로, 그 외 만료는 `staleSince` 를 담은 갱신 문장으로 구분해 보고한다 — 조치가 다르기 때문이다.
- 만료가 아니면 `staleWarning` 을 붙이지 않는다.
- 응답은 만료 여부와 무관하게 항상 `readOnly: true` 와 재색인 안내 `message` 를 담는다. 소비자가 lens 를 통해 재색인을 시도하지 않게 하는 것이 이 필드들의 목적이다.
- 레이어 필터를 적용하지 않는다. 반환값은 문서 본문이 아니라 인덱스 집계라 여과할 대상이 없고, 입력에도 `layer_filter` 가 없다.
- 재색인을 실행하지 않고 볼트에 쓰지 않는다 — 만료를 감지해도 보고까지가 끝이다.

## API Contracts

- `handleLensStatus(vaultPath: string, graph: KnowledgeGraph | null): Promise<Record<string, unknown>>` — 인덱스 상태 응답. 서버가 볼트 이름을 해석해 경로와 그래프를 넘기므로 이 핸들러는 툴 입력 객체를 받지 않는다.
- `LensStatusInput` — 툴 입력 형태를 기술하는 타입(`vault` 선택). 핸들러 파라미터가 아니라 서버 스키마와 짝이 되는 선언이다.
- 반환 객체는 maencof 상태 응답의 얕은 복사에 다음을 더한 것이다: `readOnly: true`, 재색인 안내 `message`, 그리고 만료일 때만 `staleWarning`.
- `graph` 가 `null` 이어도 throw 하지 않는다. maencof 가 노드 수 0 · `rebuildRecommended: true` 인 상태 응답을 돌려주고 여기에 lens 고유 필드가 그대로 얹힌다 — 그래프 없음 자체가 보고할 상태다.

## Acceptance Criteria

### AC-stale-warning-kinds — 만료 종류 구분

- legacy 마커로 판정되면 v1 스키마 마이그레이션을 지목하는 경고가 나온다.
- 일반 만료면 `staleSince` 값을 담은 갱신 경고가 나온다.
- 만료가 아니면 `staleWarning` 필드가 없다.

### AC-read-only-marker — 읽기 전용 표시

- 만료 여부와 무관하게 응답에 `readOnly: true` 와 재색인 안내 `message` 가 있다.

### AC-no-reindex — 재색인 미실행

- 만료를 감지해도 인덱스 재생성이나 볼트 쓰기가 일어나지 않는다.
- 만료 판정이 `detectStale` 한 경로만 거친다.

## Last Updated

2026-07-30 — 만료 경고 구분과 읽기 전용 표시 계약을 문서화했다.
