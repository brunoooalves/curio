import { describe, it, expect } from "vitest";
import { parseQuantity } from "@/lib/domain/ingredient/parseQuantity";

describe("parseQuantity", () => {
  it("parses grams in various forms", () => {
    expect(parseQuantity("200g", null)).toEqual({ kind: "numeric", value: 200, unit: "g" });
    expect(parseQuantity("200 g", null)).toEqual({ kind: "numeric", value: 200, unit: "g" });
    expect(parseQuantity("200G", null)).toEqual({ kind: "numeric", value: 200, unit: "g" });
  });

  it("converts kg to g", () => {
    expect(parseQuantity("1.5kg", null)).toEqual({ kind: "numeric", value: 1500, unit: "g" });
    expect(parseQuantity("1,5 kg", null)).toEqual({ kind: "numeric", value: 1500, unit: "g" });
  });

  it("parses ml and converts l to ml", () => {
    expect(parseQuantity("300ml", null)).toEqual({ kind: "numeric", value: 300, unit: "ml" });
    expect(parseQuantity("0.5l", null)).toEqual({ kind: "numeric", value: 500, unit: "ml" });
    expect(parseQuantity("0,5 L", null)).toEqual({ kind: "numeric", value: 500, unit: "ml" });
  });

  it("parses count + label as unit", () => {
    expect(parseQuantity("1 colher de sopa", null)).toEqual({
      kind: "unit",
      value: 1,
      label: "colher de sopa",
    });
    expect(parseQuantity("2 unidades", null)).toEqual({
      kind: "unit",
      value: 2,
      label: "unidades",
    });
    expect(parseQuantity("1 maço", null)).toEqual({ kind: "unit", value: 1, label: "maço" });
  });

  it("treats 'a gosto' / 'qb' / empty as free", () => {
    expect(parseQuantity("a gosto", null)).toEqual({ kind: "free", raw: "a gosto" });
    expect(parseQuantity("A Gosto", null)).toEqual({ kind: "free", raw: "A Gosto" });
    expect(parseQuantity("qb", null)).toEqual({ kind: "free", raw: "qb" });
    expect(parseQuantity("q.b.", null)).toEqual({ kind: "free", raw: "q.b." });
    expect(parseQuantity("", null)).toEqual({ kind: "free", raw: "" });
  });

  it("falls back to defaultUnit when only a bare number is provided", () => {
    expect(parseQuantity("250", "g")).toEqual({ kind: "numeric", value: 250, unit: "g" });
    expect(parseQuantity("3", "unidade")).toEqual({ kind: "unit", value: 3, label: "unidade" });
    expect(parseQuantity("3", null)).toEqual({ kind: "free", raw: "3" });
  });

  it("returns free for completely unparseable strings", () => {
    expect(parseQuantity("a vontade quase", null)).toEqual({
      kind: "free",
      raw: "a vontade quase",
    });
  });
});
