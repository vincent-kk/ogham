/**
 * 병합·삭제에서 버리는 키. 대입 대상이 되면 프로토타입 체인을 건드린다.
 *
 * `JSON.parse('{"__proto__":{...}}')`는 `__proto__`를 own enumerable key로
 * 만든다. 그 키를 일반 객체에 대입하면 프로토타입 설정자가 호출되어
 * `Object.prototype`이 오염된다. 입력이 디스크의 JSON이므로 실제 벡터다.
 *
 * `Set`으로 두는 이유는 조회 속도가 아니라(3개뿐이다) 목록이 한 곳에만
 * 존재하게 하기 위해서다. `mergeConfigLayers`, `listOverriddenPaths`,
 * `removePath`가 모두 이 집합을 쓴다.
 */
export const FORBIDDEN_KEYS: ReadonlySet<string> = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);
