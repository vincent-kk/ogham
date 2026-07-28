import { describe, expect, it } from "vitest";

import { mergeConfigLayers } from "../index.js";

describe("mergeConfigLayers", () => {
  it("returns an empty document when both layers are absent", () => {
    expect(mergeConfigLayers(null, null)).toEqual({});
  });

  it("copies the base layer when no override exists", () => {
    const base = { theme: "dark" };
    const merged = mergeConfigLayers(base, null);

    expect(merged).toEqual({ theme: "dark" });
    expect(merged).not.toBe(base);
  });

  it("copies the override layer when no base exists", () => {
    const override = { theme: "light" };
    const merged = mergeConfigLayers(null, override);

    expect(merged).toEqual({ theme: "light" });
    expect(merged).not.toBe(override);
  });

  it("lets the override replace a top-level primitive", () => {
    expect(mergeConfigLayers({ port: 3000 }, { port: 8080 })).toEqual({
      port: 8080,
    });
  });

  it("merges nested plain objects key by key", () => {
    expect(mergeConfigLayers({ a: { x: 1, y: 2 } }, { a: { y: 9 } })).toEqual({
      a: { x: 1, y: 9 },
    });
  });

  it("replaces an array wholesale so a shorter list can shrink a longer one", () => {
    // 이 케이스가 배열 전략을 가르는 오라클이다. 참조 구현(albatrion merge)은
    // 인덱스 단위로 병합해 [9, 2, 3]을 만들고, 그러면 project 레이어에서
    // 목록을 줄일 방법이 없어진다.
    expect(mergeConfigLayers({ v: [1, 2, 3] }, { v: [9] })).toEqual({ v: [9] });
  });

  it("lets an array replace an object", () => {
    expect(mergeConfigLayers({ v: { a: 1 } }, { v: [1, 2] })).toEqual({
      v: [1, 2],
    });
  });

  it("lets a primitive replace an object", () => {
    expect(mergeConfigLayers({ v: { a: 1 } }, { v: "plain" })).toEqual({
      v: "plain",
    });
  });

  it("treats an explicit null in the override as a replacing value", () => {
    expect(mergeConfigLayers({ v: { a: 1 } }, { v: null })).toEqual({ v: null });
  });

  it("recurses through three levels of nesting", () => {
    expect(
      mergeConfigLayers(
        { a: { b: { c: 1, d: 2 } } },
        { a: { b: { d: 20, e: 30 } } },
      ),
    ).toEqual({ a: { b: { c: 1, d: 20, e: 30 } } });
  });

  it("mutates neither input", () => {
    const base = { a: { x: 1 }, keep: true };
    const override = { a: { y: 2 } };

    mergeConfigLayers(base, override);

    expect(base).toEqual({ a: { x: 1 }, keep: true });
    expect(override).toEqual({ a: { y: 2 } });
  });

  it("drops a __proto__ key from the override instead of polluting Object.prototype", () => {
    // 리터럴이 아니라 JSON.parse로 만들어야 한다. 객체 리터럴의 __proto__는
    // own key가 아니라 프로토타입 설정 문법이라 이 취약점을 재현하지 못한다.
    const override = JSON.parse('{"__proto__":{"polluted":"x"}}') as Record<
      string,
      unknown
    >;

    const merged = mergeConfigLayers({ theme: "dark" }, override);

    // 이 구현은 불변이라 오염이 전역 Object.prototype이 아니라 결과 객체의
    // 프로토타입으로 나타난다. 그래서 hasOwn/toEqual만으로는 가드를 빼도
    // 통과한다 — 프로토타입 동일성과 상속 조회를 함께 봐야 가드가 검증된다.
    expect(Object.getPrototypeOf(merged)).toBe(Object.prototype);
    expect((merged as { polluted?: unknown }).polluted).toBeUndefined();
    expect((({}) as Record<string, unknown>).polluted).toBeUndefined();
    expect(merged).toEqual({ theme: "dark" });
  });

  it("drops a constructor key from either layer", () => {
    const base = JSON.parse('{"constructor":"from-base","keep":1}') as Record<
      string,
      unknown
    >;
    const override = JSON.parse(
      '{"constructor":"from-override","add":2}',
    ) as Record<string, unknown>;

    const merged = mergeConfigLayers(base, override);

    expect(Object.hasOwn(merged, "constructor")).toBe(false);
    expect(merged).toEqual({ keep: 1, add: 2 });
  });

  it("drops a __proto__ key present only in the base layer", () => {
    const base = JSON.parse('{"__proto__":{"polluted":"x"},"keep":1}') as Record<
      string,
      unknown
    >;

    const merged = mergeConfigLayers(base, { add: 2 });

    expect(Object.getPrototypeOf(merged)).toBe(Object.prototype);
    expect((merged as { polluted?: unknown }).polluted).toBeUndefined();
    expect(merged).toEqual({ keep: 1, add: 2 });
  });
});
