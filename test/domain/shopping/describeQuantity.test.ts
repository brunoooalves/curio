import { describe, it, expect } from "vitest";
import { describeQuantity } from "@/lib/domain/shopping/describeQuantity";

describe("describeQuantity", () => {
  it("formats grams with kg promotion above 1000g", () => {
    expect(describeQuantity({ kind: "sum", value: 800, unit: "g" })).toEqual({
      display: "800 g",
      raw: null,
      packaging: "1 pacote (1 kg)",
    });
    expect(describeQuantity({ kind: "sum", value: 1500, unit: "g" })).toEqual({
      display: "1.5 kg",
      raw: null,
      packaging: "1.5 kg",
    });
  });

  it("formats ml with L promotion and packaging hints", () => {
    expect(describeQuantity({ kind: "sum", value: 350, unit: "ml" })).toEqual({
      display: "350 ml",
      raw: null,
      packaging: "1 garrafa",
    });
    expect(describeQuantity({ kind: "sum", value: 1200, unit: "ml" })).toEqual({
      display: "1.2 L",
      raw: null,
      packaging: "1 litro",
    });
    expect(describeQuantity({ kind: "sum", value: 2500, unit: "ml" })).toEqual({
      display: "2.5 L",
      raw: null,
      packaging: "2.5 litros",
    });
  });

  it("converts cooking units (colher de sopa) to mL with raw fallback", () => {
    const result = describeQuantity({
      kind: "sum",
      value: 11,
      unit: "colher de sopa",
    });
    expect(result.display).toBe("~170 ml");
    expect(result.raw).toBe("11 colher de sopa");
    expect(result.packaging).toBe("1 garrafa pequena");
  });

  it("converts xícaras to mL", () => {
    const result = describeQuantity({
      kind: "sum",
      value: 2,
      unit: "xícaras",
    });
    expect(result.display).toBe("~500 ml");
    expect(result.raw).toBe("2 xícaras");
  });

  it("preserves piece units without packaging hint", () => {
    expect(describeQuantity({ kind: "sum", value: 3, unit: "unidade" })).toEqual({
      display: "3 unidades",
      raw: null,
      packaging: null,
    });
    expect(describeQuantity({ kind: "sum", value: 1, unit: "dente" })).toEqual({
      display: "1 dente",
      raw: null,
      packaging: null,
    });
  });

  it("falls back to literal display for unknown unit labels", () => {
    expect(
      describeQuantity({ kind: "sum", value: 2, unit: "ramos pequenos" }),
    ).toEqual({
      display: "2 ramos pequenos",
      raw: null,
      packaging: null,
    });
  });

  it("joins mixed parts as literal display", () => {
    expect(
      describeQuantity({
        kind: "mixed",
        parts: ["200 g", "1 unidade"],
      }),
    ).toEqual({
      display: "200 g + 1 unidade",
      raw: null,
      packaging: null,
    });
  });

  it("uses free note as display", () => {
    expect(describeQuantity({ kind: "free", note: "a gosto" })).toEqual({
      display: "a gosto",
      raw: null,
      packaging: null,
    });
  });
});
