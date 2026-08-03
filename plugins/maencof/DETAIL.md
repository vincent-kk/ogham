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

## Last Updated

2026-08-04 — 기존 지침 구간 계약을 검증 가능한 acceptance group 으로 고정했다.
