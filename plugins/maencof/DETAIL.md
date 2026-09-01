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

### AC-explain-explanation — 개념·관계 중심 시각 설명

- 설명의 대상은 사람·조직·시스템·계획·코드를 포함하며 maencof vault 안의 개념으로 제한하지 않는다.
- 질문이 필요한 근거원을 결정하며, 직접 관찰·대화·문서·코드·외부 자료를 대상에 맞게 선택한다.
- maencof vault는 관련 기록이 있고 도구가 사용 가능할 때 쓰는 선택적 근거원이다. vault 경로·인덱스·읽기 오류는 그 근거원을 사용 불가로 표시할 뿐 대상의 부재 근거가 아니며, 다른 근거원으로 계속한다.
- 가리킨 자료만으로 설명하지 않는다. 코드는 호출자·설정·테스트를, 사람·조직·계획은 날짜 있는 행동·결과·독립 계정을, vault 기록은 연결 문서를 — 이해가 접지될 때까지 연결 근거를 따라간 뒤에 쓴다.
- 설명의 뼈대는 개념-관계 지도다. 독자가 답을 이해하는 데 필요한 용어를 고르고, 각 용어에 한 문장 구체 정의와 다른 용어와의 관계 — 호출·소유·선행·제약·영향 — 를 부여하며, 질문과 관계없는 개념은 싣지 않는다.
- 구체 시나리오 하나를 실제 이름·값·날짜로 실제 순서 끝까지 따라가며 모든 추상을 관찰 가능한 흐름에 연결한다.
- 서술은 스킬 동봉 `reference.md` 의 편집 스타일을 따른다 — 문제 장면 선행 도입, 질문이 개념에 앞서는 전개, 용어 첫 등장 정의, 코드 전후 설명 샌드위치, 트레이드오프를 밝히는 마무리. 본문 언어는 지정된 독자를 따른다.
- 확보 가능한 근거가 부족하면 사용자만 제공할 수 있는 관찰을 한 번 요청하고, 그래도 부족하면 HTML 산출물을 만들지 않고 중단한다.
- 근거가 충분한 완전한 산출물은 실행 환경이 선택한 쓰기 가능한 임시 또는 스크래치 파일시스템 위치에 저장하는 `single self-contained HTML` 파일 한 개이며, 대화는 한 문장 요약과 링크만 건넨다.
- HTML 작성과 렌더링 점검을 마치면 대화로 인계하기 전에 완성된 파일을 시스템 기본 브라우저로 연다.
- 렌더링 검증은 대표 데스크톱·모바일 뷰포트 각 1개와 인터랙션 유형별 1회로 제한하고, 수정 뒤에는 영향받은 뷰만 재확인한다. 전면 브라우저 커버리지나 분석 대상의 정확성 검증으로 확장하지 않는다.

## History

- 2026-09-01 — mental-model 스킬을 explain 으로 개명하고, 중심 원리를 세워 연역·공격하는 방법을 제거했다. 연결된 근거를 따라가 정확히 이해한 뒤 개념-관계 지도를 뼈대로 가르치는 방식이 하나의 원리 방어보다 설명력을 높인다는 판단에서다. 편집 스타일은 seiri explain 과 같은 형태의 동봉 `reference.md` 가 소유한다.
- 2026-08-28 — mental-model의 렌더링 검증을 대표 데스크톱·모바일 뷰포트와 인터랙션 유형별 한 번의 스모크 체크로 제한했다. 표시 안정성을 유지하면서 설명 생성보다 검증에 과도한 시간을 쓰지 않도록 하기 위해서다.
- 2026-08-28 — HTML 산출물을 작성한 뒤 시스템 기본 브라우저로 여는 종료 동작을 추가했다. 산출물 인계와 실제 열람 사이의 수동 단계를 없애기 위해서다.
- 2026-08-28 — mental-model을 vault 중심의 기록 재구성에서 질문이 정한 모든 대상을 다루는 예측형 시각 설명으로 교체했다. vault 문맥은 필요할 때만 조회해 자동 주입이 범위를 결정하지 않게 했다.

## Last Updated

2026-09-01 — mental-model 을 explain 으로 개명하고 설명 방법을 개념-관계 중심으로 재작성했다.
