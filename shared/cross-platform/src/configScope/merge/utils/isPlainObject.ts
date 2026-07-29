/**
 * 배열도 null도 클래스 인스턴스도 아닌 순수 객체인지.
 *
 * 판정 3단: (1) object이고 falsy가 아님 (2) 프로토타입이 null이거나
 * `Object.prototype`이거나, 그 프로토타입이 null (= `Object.create(null)` 계열)
 * (3) toString 태그가 `'[object Object]'`.
 *
 * 배열은 toString 태그가 `'[object Array]'`라 3단에서 탈락한다. 그래서
 * `Array.isArray` 분기를 따로 두지 않는다.
 *
 * 주의: `Object.prototype` 자체도 true다 — 프로토타입이 null이고 태그가
 * `'[object Object]'`이기 때문이다. 병합·삭제 경로가 `FORBIDDEN_KEYS`를
 * 차단해야 하는 직접적인 이유다.
 *
 * 원본: albatrion/packages/winglet/common-utils/src/utils/filter/isPlainObject.ts
 */
export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;

  const proto = Object.getPrototypeOf(value) as object | null;
  const hasObjectPrototype =
    proto === null ||
    proto === Object.prototype ||
    Object.getPrototypeOf(proto) === null;
  if (!hasObjectPrototype) return false;

  return Object.prototype.toString.call(value) === "[object Object]";
}
