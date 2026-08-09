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

/**
 * compound(kebab/snake — 공백 없이 `-`/`_` 로 결합된 다토큰) 시드가 원형 완전
 * 일치에 실패하고 분해 AND 도 공집합일 때, OR 확장이 유입시키는 부분 매칭 노드의
 * 저득점. AND 가 살아 있으면 기존 다토큰 의미론이 그대로 적용된다. 값의 정본은
 * compoundScoreSweep eval — 경쟁 골든(compound-or-vs-prefix-tier)에서 0.3 미만은
 * 접두 우연 매칭(tag-prefix)이 명시 개념의 부분 회수를 앞질러 지표가 하락하고,
 * 0.3~0.45 는 공최적이라 최저 공최적값을 쓴다. 상대 IDF 노이즈 강등을 되돌리지
 * 않는 tag-exact(0.5) 미만 상한과 정합한다.
 */
export const COMPOUND_OR_MATCH_SCORE = 0.3;

/**
 * compound 분해 OR 폴백의 union 에 참여하는 토큰의 최소 길이. 1자 토큰(예: "ACT-R" 의
 * "r")은 prefix 후보가 무제한으로 넓어 폴백을 노이즈로 뒤덮는다 — union 에서만 제외하고,
 * 전 토큰 보유(full) 판정에는 그대로 참여시켜 기존 다토큰 분류를 보존한다.
 */
export const COMPOUND_FALLBACK_MIN_TOKEN_LENGTH = 2;
