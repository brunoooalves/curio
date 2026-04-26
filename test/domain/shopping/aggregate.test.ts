import { describe, it, expect } from "vitest";
import { aggregateIngredients } from "@/lib/domain/shopping/aggregate";
import type { ParsedQuantity } from "@/lib/domain/ingredient/parseQuantity";

function input(canonical: string, parsed: ParsedQuantity, rawText: string, recipeId: string) {
  return { canonicalName: canonical, parsed, rawText, recipeId };
}

describe("aggregateIngredients", () => {
  it("sums numerics with the same unit", () => {
    const lines = aggregateIngredients([
      input("Tomate", { kind: "numeric", value: 200, unit: "g" }, "200 g", "r1"),
      input("Tomate", { kind: "numeric", value: 300, unit: "g" }, "300 g", "r2"),
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.aggregatedQuantity).toEqual({ kind: "sum", value: 500, unit: "g" });
    expect(lines[0]?.sourceRecipeIds.sort()).toEqual(["r1", "r2"]);
  });

  it("emits mixed when units differ", () => {
    const lines = aggregateIngredients([
      input("Tomate", { kind: "numeric", value: 200, unit: "g" }, "200 g", "r1"),
      input("Tomate", { kind: "numeric", value: 300, unit: "ml" }, "300 ml", "r2"),
    ]);
    expect(lines[0]?.aggregatedQuantity.kind).toBe("mixed");
  });

  it("sums units with the same label", () => {
    const lines = aggregateIngredients([
      input("Cebola", { kind: "unit", value: 1, label: "unidade" }, "1 unidade", "r1"),
      input("Cebola", { kind: "unit", value: 2, label: "unidade" }, "2 unidade", "r2"),
    ]);
    expect(lines[0]?.aggregatedQuantity).toEqual({ kind: "sum", value: 3, unit: "unidade" });
  });

  it("emits mixed when labels differ", () => {
    const lines = aggregateIngredients([
      input("Sal", { kind: "unit", value: 1, label: "colher de sopa" }, "1 colher de sopa", "r1"),
      input("Sal", { kind: "unit", value: 2, label: "colher de cha" }, "2 colher de cha", "r2"),
    ]);
    expect(lines[0]?.aggregatedQuantity.kind).toBe("mixed");
  });

  it("propagates a single free note", () => {
    const lines = aggregateIngredients([
      input("Sal", { kind: "free", raw: "a gosto" }, "a gosto", "r1"),
    ]);
    expect(lines[0]?.aggregatedQuantity).toEqual({ kind: "free", note: "a gosto" });
  });

  it("emits mixed when free + numeric", () => {
    const lines = aggregateIngredients([
      input("Sal", { kind: "numeric", value: 5, unit: "g" }, "5 g", "r1"),
      input("Sal", { kind: "free", raw: "a gosto" }, "a gosto", "r2"),
    ]);
    expect(lines[0]?.aggregatedQuantity.kind).toBe("mixed");
  });

  it("groups by canonical name and dedups source ids", () => {
    const lines = aggregateIngredients([
      input("Alho", { kind: "unit", value: 1, label: "dente" }, "1 dente", "r1"),
      input("Alho", { kind: "unit", value: 1, label: "dente" }, "1 dente", "r1"),
      input("Cebola", { kind: "unit", value: 1, label: "unidade" }, "1 unidade", "r2"),
    ]);
    expect(lines.map((l) => l.canonicalName)).toEqual(["Alho", "Cebola"]);
    expect(lines[0]?.sourceRecipeIds).toEqual(["r1"]);
  });

  it("sorts output by canonical name", () => {
    const lines = aggregateIngredients([
      input("Tomate", { kind: "free", raw: "a gosto" }, "a gosto", "r1"),
      input("Alho", { kind: "free", raw: "a gosto" }, "a gosto", "r1"),
      input("Cebola", { kind: "free", raw: "a gosto" }, "a gosto", "r1"),
    ]);
    expect(lines.map((l) => l.canonicalName)).toEqual(["Alho", "Cebola", "Tomate"]);
  });
});
