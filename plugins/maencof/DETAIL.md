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

SessionStart의 기존 지침 작성은 현재 vault 초기화·버전 갱신 호환성 때문에 남겨 둔다. 이 경로는 `@ogham/agent-artifacts/instructions/hook`과 목적별 project instruction target만 가져와 범용 manager의 plan·revision·lock 그래프를 훅 번들에서 제외한다. 새 제품별 writer의 선례가 아니며, MCP·공개 호환 API는 계속 범용 공유 manager를 사용한다.

## Last Updated

2026-07-26 — 지침 관리를 `@ogham/agent-artifacts`에 위임하는 계약 선언.
