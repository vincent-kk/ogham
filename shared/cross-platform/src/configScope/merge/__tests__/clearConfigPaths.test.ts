import { describe, expect, it } from "vitest";

import { clearConfigPaths } from "../index.js";

describe("clearConfigPaths", () => {
  it("leaves the document untouched when the path is absent", () => {
    expect(clearConfigPaths({ a: 1 }, ["missing"])).toEqual({ a: 1 });
  });

  it("removes a top-level key", () => {
    expect(clearConfigPaths({ a: 1, b: 2 }, ["a"])).toEqual({ b: 2 });
  });

  it("keeps the parent when a sibling survives", () => {
    expect(
      clearConfigPaths({ r: { mermaid: true, math: false } }, ["r.math"]),
    ).toEqual({ r: { mermaid: true } });
  });

  it("prunes a parent that the removal emptied", () => {
    expect(clearConfigPaths({ r: { mermaid: true } }, ["r.mermaid"])).toEqual(
      {},
    );
  });

  it("prunes emptied parents all the way up three levels", () => {
    expect(clearConfigPaths({ a: { b: { c: 1 } } }, ["a.b.c"])).toEqual({});
  });

  it("removes several paths in one call", () => {
    expect(clearConfigPaths({ a: 1, b: 2, c: 3 }, ["a", "c"])).toEqual({ b: 2 });
  });

  it("does not mutate the input", () => {
    const source = { a: { b: 1 }, keep: true };

    clearConfigPaths(source, ["a.b"]);

    expect(source).toEqual({ a: { b: 1 }, keep: true });
  });

  it("ignores a constructor path instead of walking the prototype chain", () => {
    // `in` 대신 Object.hasOwn을 쓰는지의 오라클. `in`이면
    // Object.prototype.constructor가 잡혀 없는 키를 지우려 든다.
    const source = { a: 1 };

    expect(clearConfigPaths(source, ["constructor"])).toEqual({ a: 1 });
  });

  it("ignores a __proto__ path even when the document owns that key", () => {
    // JSON.parse여야 __proto__가 own key가 된다. 리터럴로는 Object.hasOwn이
    // 먼저 걸러버려 FORBIDDEN_KEYS 가드를 검증하지 못한다.
    const source = JSON.parse('{"__proto__":{"polluted":"x"},"a":1}') as Record<
      string,
      unknown
    >;

    const cleared = clearConfigPaths(source, ["__proto__"]);

    expect(cleared).toBe(source);
    expect(Object.hasOwn(cleared, "__proto__")).toBe(true);
    expect((({}) as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("ignores a nested path that descends through __proto__", () => {
    const source = JSON.parse('{"__proto__":{"polluted":"x"},"a":1}') as Record<
      string,
      unknown
    >;

    const cleared = clearConfigPaths(source, ["__proto__.polluted"]);

    expect(cleared).toBe(source);
    expect(Object.getPrototypeOf(cleared)).toBe(Object.prototype);
  });

  it("stops at a non-object on the way down", () => {
    expect(clearConfigPaths({ a: "text" }, ["a.b"])).toEqual({ a: "text" });
  });
});
