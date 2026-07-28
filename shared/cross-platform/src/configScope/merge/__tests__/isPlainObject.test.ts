import { describe, expect, it } from "vitest";

import { isPlainObject } from "../index.js";

describe("isPlainObject", () => {
  it("accepts an object literal", () => {
    expect(isPlainObject({ a: 1 })).toBe(true);
  });

  it("accepts a null-prototype object", () => {
    expect(isPlainObject(Object.create(null))).toBe(true);
  });

  it("rejects an array", () => {
    expect(isPlainObject([1, 2])).toBe(false);
  });

  it("rejects null and undefined", () => {
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject(undefined)).toBe(false);
  });

  it("rejects primitives", () => {
    expect(isPlainObject(42)).toBe(false);
    expect(isPlainObject("text")).toBe(false);
    expect(isPlainObject(true)).toBe(false);
  });

  it("rejects a Date", () => {
    expect(isPlainObject(new Date())).toBe(false);
  });

  it("rejects a class instance", () => {
    class Config {}
    expect(isPlainObject(new Config())).toBe(false);
  });

  it("rejects exotic namespace objects by their toString tag", () => {
    expect(isPlainObject(Math)).toBe(false);
    expect(isPlainObject(JSON)).toBe(false);
  });

  it("accepts Object.prototype itself — which is why FORBIDDEN_KEYS exists", () => {
    // 의외지만 의도된 결과다. Object.prototype은 프로토타입이 null이고 태그가
    // '[object Object]'라 3단 판정을 모두 통과한다. 병합이 이 값을 재귀 대상으로
    // 삼는 것이 오염 경로이므로, 방어는 이 가드가 아니라 키 차단이 맡는다.
    expect(isPlainObject(Object.prototype)).toBe(true);
  });
});
