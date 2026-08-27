# Maencof Public Contract

## Requirements

- Maencof 지침은 프로젝트에서 호스트가 실제로 읽는 Claude/Codex 지침 후보의 `<!-- MAENCOF:START -->` / `<!-- MAENCOF:END -->` 구간만 소유한다.
- 지침 대상 선택, 구간 상태, 계획, 리비전 잠금 적용은 `@ogham/agent-artifacts`에 위임한다.
- 기존 raw `filePath` API는 전달받은 정확한 파일만 관리한다. 프로젝트나 호스트를 다시 해석하지 않는다.
- 실제로 기존 파일을 변경할 때만 같은 경로의 `.bak`에 변경 전 바이트를 기록한다. dry-run과 무변경에서는 백업을 만들지 않는다.
- 마커 밖 사용자 텍스트와 다른 소유자의 구간을 보존한다.

## API Contracts

`mergeMaencofSection`, `readMaencofSection`, `removeMaencofSection`, `ClaudeMdMerger`의 이름·인자·결과 형식은 유지한다. 이 호환 API는 `createResolvedInstructionSectionManager`를 감싸며 전달된 경로를 다른 Claude/Codex 후보로 바꾸지 않는다.

`claudemd_merge`, `claudemd_read`, `claudemd_remove` MCP 도구 이름과 응답 스키마는 유지한다. 도구와 호스트 인식 경로 판독은 project target으로 Claude의 기존 후보와 Codex의 유효 `AGENTS*.md` 후보를 선택한다.

SessionStart의 기존 지침 작성은 현재 vault 초기화·버전 갱신 호환성 때문에 남겨 둔다. 이 경로는 `@ogham/agent-artifacts` 패키지 루트에서 경량 API를 가져오고 목적별 project instruction target만 사용한다. `sideEffects: false`와 출력 번들 가드가 범용 manager의 plan·revision·lock 그래프가 훅 번들에 남지 않음을 확인한다. 새 제품별 writer의 선례가 아니며, MCP·공개 호환 API는 계속 범용 공유 manager를 사용한다.

## Acceptance Criteria

### AC-marker-scope-only — 마커 구간만 소유

- 병합·제거가 `<!-- MAENCOF:START -->` / `<!-- MAENCOF:END -->` 사이만 바꾸고, 마커 밖 사용자 텍스트와 다른 소유자의 구간은 바이트 그대로 남는다.

### AC-raw-path-not-reresolved — raw 경로 재해석 금지

- `filePath` 를 직접 받는 호환 API 는 전달된 경로만 관리하며, 다른 Claude/Codex 후보로 대상을 바꾸지 않는다.

### AC-backup-only-on-real-change — 실제 변경에만 백업

- 기존 파일의 바이트가 실제로 바뀔 때만 같은 경로에 `.bak` 이 생기고, dry-run 과 무변경 호출은 백업을 만들지 않는다.

### AC-compat-surface-stable — 호환 표면 유지

- `mergeMaencofSection` · `readMaencofSection` · `removeMaencofSection` · `ClaudeMdMerger` 의 이름·인자·결과 형식과 `claudemd_merge` · `claudemd_read` · `claudemd_remove` 의 도구 이름·응답 스키마가 유지된다.

### AC-hook-bundle-stays-light — 훅 번들 경량 유지

- SessionStart 훅 번들에 범용 manager 의 plan·revision·lock 그래프가 남지 않는다(`sideEffects: false` + 출력 번들 가드).

### AC-mental-model-explanation — 일반화된 예측형 시각 멘탈 모델

- 멘탈 모델의 대상은 사람·조직·시스템·계획·코드를 포함하며 maencof vault 안의 개념으로 제한하지 않는다.
- 질문이 필요한 근거원을 결정하며, 직접 관찰·대화·문서·코드·외부 자료를 대상에 맞게 선택한다.
- maencof vault는 관련 기록이 있고 도구가 사용 가능할 때 쓰는 선택적 근거원이다. vault 경로·인덱스·읽기 오류는 그 근거원을 사용 불가로 표시할 뿐 대상의 부재 근거가 아니며, 다른 근거원으로 계속한다.
- 하나의 구체적인 예측 중심 원리에서 `전제 → 결과 → 메커니즘 → 관찰 가능한 동작`을 연역한다.
- 각 주장은 독립 근거와 구체적 시뮬레이션의 반례 공격을 마쳐야 생존하며, 중심 원리가 바뀌면 그 원리에 의존한 하위 주장을 폐기하고 다시 연역·공격한다.
- 중심 원리 후보가 두 번 연속 반례 공격을 통과하지 못하면 단일 원리로 설명할 수 없다고 보고 모델과 HTML 없이 중단한다.
- 확보 가능한 근거가 부족하면 사용자만 제공할 수 있는 관찰을 한 번 요청하고, 그래도 부족하면 모델과 HTML 산출물을 만들지 않고 중단한다.
- 근거가 충분한 완전한 산출물은 실행 환경이 선택한 쓰기 가능한 임시 또는 스크래치 파일시스템 위치에 저장하는 `single self-contained HTML` 파일 한 개이며, 대화는 한 문장 요약과 링크만 건넨다.

## History

- 2026-08-28 — mental-model을 vault 중심의 기록 재구성에서 질문이 정한 모든 대상을 다루는 예측형 시각 설명으로 교체했다. vault 문맥은 필요할 때만 조회해 자동 주입이 범위를 결정하지 않게 했다.

## Last Updated

2026-08-28 — mental-model의 일반 대상 범위, 선택적 vault 근거, 시각 HTML 산출물 계약을 추가했다.
