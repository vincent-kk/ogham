/**
 * @file queryEngine.ts (constants)
 * @description QueryEngine 시드 해석 정책 상수 — 다토큰 phrase 보너스, 경로 prefix·허브 태그 시드 budget.
 */

/**
 * 단일 키워드 시드가 분할되어 다토큰(phrase)으로 해석될 때, 제목에 토큰이 연속(phrase)으로
 * 등장하면 부여하는 점수 보너스. AND(교집합) 최저 토큰 점수에 가산한다.
 */
export const PHRASE_CONTIGUITY_BONUS = 0.15;

/**
 * 경로 prefix(폴더) 시드가 해석될 때 폴더 내에서 시드로 채택할 최대 노드 수.
 * pagerank 상위 K개만 채택해 대형 폴더 클리크의 시드 폭발을 차단한다.
 */
export const PATH_PREFIX_SEED_CAP = 25;

/** 경로 prefix(폴더 멤버)로 해석된 시드 노드의 매칭 점수. path-exact 와 달리 결과에 노출된다. */
export const PATH_PREFIX_MATCH_SCORE = 0.5;

/**
 * 단일 키워드 시드의 후보가 이 수를 초과하면 변별력 없는 허브 태그(예: `security` 127노드)로 보고
 * pagerank 상위 K개만 시드로 채택한다. 초기 활성 질량 폭발(도배)을 직접 억제한다.
 * 임계 이하 쿼리는 영향 없음.
 */
export const KEYWORD_SEED_CAP = 30;
