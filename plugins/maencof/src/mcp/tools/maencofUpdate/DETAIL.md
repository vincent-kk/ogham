# maencofUpdate — DETAIL

## Requirements

- `update` 는 기존 문서의 frontmatter 와 본문을 수정한다. 경로는 `resolveWithinVault` 로 vault 내부 봉쇄를 검증한다.
- L1 문서 수정은 3중 게이트를 모두 통과해야 한다 — 구조화된 `change_reason`, 20자 이상 `justification`, `confirm_l1: true`.
- L1 문서의 `layer` 필드는 `update` 로 바꿀 수 없고, L1 에서는 `frontmatter.unset` 자체를 쓸 수 없다(구조화된 amendment 경로를 쓴다).
- `frontmatter.unset` 은 모든 레이어에서 `created` · `updated` · `layer` · `tags` 를 거부한다 — 데이터 무결성 핵심 필드다.
- unset 은 set 보다 먼저 처리한다. 같은 키를 set 과 unset 에 함께 주면 set 이 이긴다.
- 쓰기 직전 `validateFrontmatter` 게이트를 통과해야 한다. 손상된 frontmatter 의 복구 경로는 `frontmatter.unset` 이다.
- 대상 문서의 노드 구성(`buildKnowledgeNode`)은 `allowNonLayerPath` 옵트아웃을 쓴다 — 레이어 디렉토리 밖 경로 문서도 update 대상이며, 그래프 편입 자격은 색인 경로의 기본 게이트(`isLayerDirPath`) 소관이다.
- 본문 수정은 `deduplicateContent` 를 거친다.

## API Contracts

### Frontmatter 패치 (`MaencofUpdateFrontmatter`)

| 연산              | 동작                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------- |
| `unset: string[]` | 키 라인을 제거한다. 보호 필드는 거부, L1 은 연산 자체를 거부한다.                     |
| `hub: false`      | `hub` 키를 제거한다                                                                   |
| `hub: true`       | `hub: true` 로 패치한다                                                               |
| `hub_kind`        | 값을 패치한다                                                                         |
| `purpose`         | `quoteYamlValue` 로 인용해 패치한다                                                   |
| `cluster_key`     | `quoteYamlValue` 로 인용해 패치한다. 제거는 `unset: ['cluster_key']` (보호 필드 아님) |

자동 생성 필드(`AUTO_GENERATED_FM_KEYS` — `created` · `updated` · `tags` · `layer`)는 호출자가 직접 쓰는 대상이 아니다.

### Result (`MaencofCrudResult`)

- 성공: `{ success: true, path, message }`
- 실패 사유: 파일 없음 · vault 봉쇄 위반 · L1 3중 게이트 미충족 · L1 layer 변경 시도 · L1 unset 시도 · 보호 필드 unset · frontmatter 검증 실패

## Acceptance Criteria

### AC-l1-triple-gate — L1 3중 게이트

- L1 문서 수정은 `change_reason` · 20자 이상 `justification` · `confirm_l1: true` 셋을 모두 갖추지 못하면 파일을 바꾸지 않는다.

### AC-l1-layer-immutable — L1 레이어 불변

- L1 문서의 `layer` 를 바꾸려는 호출은 거부된다.

### AC-protected-unset-blocked — 보호 필드 unset 차단

- `created` · `updated` · `layer` · `tags` 를 `frontmatter.unset` 에 넣은 호출은 어떤 레이어에서도 거부되고, 거부된 키 목록이 메시지에 들어간다.

### AC-unset-before-set — unset 선처리

- 같은 키가 set 과 unset 에 함께 오면 결과 frontmatter 에는 set 값이 남는다.

### AC-hub-false-removes-key — hub 해제의 키 제거

- `hub: false` 는 `hub` 를 `false` 로 쓰지 않고 키 자체를 제거한다.

### AC-validated-before-write — 쓰기 직전 검증

- 갱신된 frontmatter 가 `validateFrontmatter` 를 통과하지 못하면 파일을 쓰지 않고, 복구 수단으로 `frontmatter.unset` 을 안내한다.

## History

- 2026-08-04 — hub 3필드(`hub` · `hub_kind` · `purpose`) 패치·제거 분기가 추가되면서 도구의 frontmatter 계약이 넓어졌다. 이전에는 이 계약이 `mcp/server/registrations/DETAIL.md` 에만 기록되어 소유 fractal 밖에 있었다.

## Last Updated

2026-08-20 — 노드 구성의 `allowNonLayerPath` 옵트아웃(그래프 편입 게이트의 검증 전용 예외)을 문서화했다.
