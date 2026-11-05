# companionBudget — Contract

## Requirements

- 렌더 길이는 반드시 `turnContext` 의 `renderIdentitySection` · `selectSections` 로 측정한다. 마크업을 여기서 다시 조립하면 측정값과 실제 주입 길이가 갈라지므로, 측정과 렌더가 같은 primitive 를 공유하는 것이 이 모듈의 존재 이유다.
- 길이 단위는 코드포인트다(`[...text].length`). UTF-16 단위로 세면 서로게이트 쌍 문자가 두 글자로 잡혀 한글·이모지가 든 섹션이 부당하게 예산을 잡아먹는다.
- 예산 초과는 결과 객체로 반환한다 — throw 하지 않고 런타임에서 자르지도 않는다. 이 모듈은 저작 시점 게이트이고, 무엇을 강등·압축할지는 호출자(companionEdit · companionMigration · setup 스킬)가 정한다.
- 채널이 대상 섹션과 렌더 형태를 함께 가른다. `turn` 은 `inject ∈ {turn, both}` 를 brief 우선으로, `session` 은 `inject ∈ {session, both}` 를 detail 로 렌더한다.
- brief 검증은 길이 역전만 자동 판정한다. brief 가 detail 보다 짧지 않으면 경고를 만들고, 의미 초과(brief ⊄ detail)는 자동 판정이 불가능하므로 저작자 확인에 남긴다.
- 파일 I/O 도 `mcp/` · `hooks/` 의존도 없다. 입력은 섹션 배열뿐이다.

## API Contracts

- offender의 길이 내림차순은 저작 도구가 압축·강등 우선순위를 정하는 근거다. 예산 초과 처리 자체는 호출자가 소유한다.
- 두 예산은 `constants/companionIdentity.ts`가 소유한다. 수치의 별도 소비처인 `skills/setup/reference.md`도 함께 검토하여 저작 안내와 게이트가 갈라지지 않게 한다.

## Acceptance Criteria

### AC-code-point-length — 코드포인트 계수

- 서로게이트 쌍 문자가 한 글자로 계산된다.

## Last Updated

저작 예산·렌더 공유 측정·brief 검증의 한계가 바뀔 때 갱신한다.
