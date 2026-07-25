# Filid Artifact Integration

## Requirements

- Filid의 rule document 선택·상태·동기화 공개 동작은 기존 호출자와 설정 UI에
  대해 호환성을 유지한다.
- Claude 프로젝트 규칙 파일과 Codex 프로젝트 지침 구간의 물리 처리는
  `@ogham/agent-artifacts`의 project rule manager에 위임한다.
- Filid는 `filid` owner를 명시하며 manifest 첫 항목에서 소유권을 추론하지
  않는다.
- 런타임 host `agy`는 측정된 기존 호환성 때문에 Claude 대상으로 명시
  매핑하고, `unknown`은 쓰지 않고 skip으로 보고한다.
- required 규칙은 항상 desired이며 drift를 자동 교체한다. optional 규칙은
  선택됐을 때만 desired이고 명시적 resync에서만 drift를 교체한다.
- Claude legacy 파일은 optional drift를 덮어쓰지 않으면서 current 파일명으로
  이동하고, 결과는 계속 `drift`로 보고한다.
- 설정 UI와 훅은 현재 host가 실제로 읽는 target의 상태만 사용한다.
- 템플릿 본문 판독 실패는 status 호출을 throw시키지 않고 resolved manifest
  metadata와 빈 entry 목록으로 저하한다. 누락 템플릿의 directory status는
  manifest/deployed hash가 같으면 기존처럼 `inSync: true`를 유지한다.
- SessionStart bootstrap 진단은 경량 `self-probe/hook`만 사용하며 범용
  self-probe·spawn·cross-spawn·which graph를 번들하지 않는다.

## API Contracts

- `syncRuleDocs(projectRoot, selection, options)`의 반환 필드와 파일명 기반
  action 목록을 보존한다.
- `getRuleDocsStatus(projectRoot, pluginRoot?)`의 optional `entries`, required
  `autoDeployed`, hash 및 plugin root 저하 계약을 보존한다.
- 템플릿 또는 manifest를 읽지 못한 항목은 예외 대신 기존 `skipped` 결과로
  변환한다.

## Last Updated

2026-07-26 — 공통 agent artifact provider로 규칙 채널을 통합하는 계약 명시.
