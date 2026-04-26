import { describe, it, expect } from "vitest";
import { computeShoppingLines } from "@/lib/domain/shopping/computeShoppingLines";
import type { Recipe } from "@/lib/domain/recipe/types";

function recipe(id: string, ingredients: { name: string; quantity: string }[]): Recipe {
  return {
    id,
    moduleId: "m1",
    title: id,
    mealType: "almoco",
    servings: 2,
    estimatedMinutes: 30,
    difficulty: 2,
    ingredients,
    steps: ["x"],
    teachesConcepts: ["c1.1"],
    status: "sugerida",
    createdAt: "n",
    updatedAt: "n",
  };
}

const fakeNormalize = async (rawNames: string[]) => {
  const map = new Map<string, { canonical: string; defaultUnit: string | null }>();
  const aliases: Record<string, { canonical: string; unit: string | null }> = {
    "tomate cereja": { canonical: "Tomate", unit: "g" },
    tomate: { canonical: "Tomate", unit: "g" },
    "tomate maduro": { canonical: "Tomate", unit: "g" },
    cebola: { canonical: "Cebola", unit: "unidade" },
    azeite: { canonical: "Azeite", unit: "ml" },
    sal: { canonical: "Sal", unit: "g" },
  };
  for (const raw of rawNames) {
    const key = raw.trim().toLowerCase();
    const a = aliases[key];
    if (a) map.set(raw.trim(), { canonical: a.canonical, defaultUnit: a.unit });
  }
  return map;
};

describe("computeShoppingLines", () => {
  it("returns empty array for empty input", async () => {
    expect(await computeShoppingLines([], fakeNormalize)).toEqual([]);
  });

  it("aggregates ingredients with overlapping canonical names across recipes", async () => {
    const lines = await computeShoppingLines(
      [
        recipe("r1", [
          { name: "tomate cereja", quantity: "200 g" },
          { name: "azeite", quantity: "30 ml" },
        ]),
        recipe("r2", [
          { name: "tomate maduro", quantity: "300 g" },
          { name: "azeite", quantity: "20 ml" },
          { name: "sal", quantity: "a gosto" },
        ]),
      ],
      fakeNormalize,
    );

    const byName = new Map(lines.map((l) => [l.canonicalName, l]));
    expect(byName.get("Tomate")?.aggregatedQuantity).toEqual({
      kind: "sum",
      value: 500,
      unit: "g",
    });
    expect(byName.get("Azeite")?.aggregatedQuantity).toEqual({
      kind: "sum",
      value: 50,
      unit: "ml",
    });
    expect(byName.get("Sal")?.aggregatedQuantity).toEqual({ kind: "free", note: "a gosto" });
    expect(byName.get("Tomate")?.sourceRecipeIds.sort()).toEqual(["r1", "r2"]);
  });

  it("uses defaultUnit fallback for bare numbers", async () => {
    const lines = await computeShoppingLines(
      [recipe("r1", [{ name: "Cebola", quantity: "3" }])],
      fakeNormalize,
    );
    expect(lines[0]?.aggregatedQuantity).toEqual({
      kind: "sum",
      value: 3,
      unit: "unidade",
    });
  });

  it("falls back to raw name when normalizer doesn't know an ingredient", async () => {
    const lines = await computeShoppingLines(
      [recipe("r1", [{ name: "Carambola exotica", quantity: "100 g" }])],
      fakeNormalize,
    );
    expect(lines[0]?.canonicalName).toBe("Carambola exotica");
    expect(lines[0]?.aggregatedQuantity).toEqual({
      kind: "sum",
      value: 100,
      unit: "g",
    });
  });
});
