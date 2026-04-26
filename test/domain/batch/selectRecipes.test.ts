import { describe, it, expect } from "vitest";
import { selectRecipesForItems } from "@/lib/domain/batch/selectRecipes";
import type { Recipe } from "@/lib/domain/recipe/types";

function recipe(id: string, mealType: Recipe["mealType"], moduleId = "m1"): Recipe {
  return {
    id,
    moduleId,
    title: id,
    mealType,
    servings: 2,
    estimatedMinutes: 30,
    difficulty: 2,
    ingredients: [{ name: "x", quantity: "1" }],
    steps: ["passo"],
    teachesConcepts: ["c1.1"],
    status: "sugerida",
    createdAt: "n",
    updatedAt: "n",
  };
}

function rngFromSeq(seq: number[]): () => number {
  let i = 0;
  return () => {
    const v = seq[i % seq.length] ?? 0;
    i++;
    return v;
  };
}

describe("selectRecipesForItems", () => {
  it("does not repeat recipes within a batch", () => {
    const candidates = {
      current: [recipe("a", "almoco"), recipe("b", "almoco")],
      review: [],
    };
    const result = selectRecipesForItems(
      [{ mealType: "almoco" }, { mealType: "almoco" }, { mealType: "almoco" }],
      candidates,
      { reviewRatio: 0 },
      rngFromSeq([0, 0, 0]),
    );
    const ids = result.map((r) => r.recipeId);
    expect(new Set(ids.filter(Boolean)).size).toBe(2);
    expect(ids[2]).toBeNull();
  });

  it("returns null when no candidate matches the meal type", () => {
    const candidates = {
      current: [recipe("a", "almoco")],
      review: [],
    };
    const result = selectRecipesForItems(
      [{ mealType: "jantar" }],
      candidates,
      { reviewRatio: 0 },
      rngFromSeq([0]),
    );
    expect(result[0]?.recipeId).toBeNull();
  });

  it("respects reviewRatio approximately (rounded to nearest)", () => {
    const candidates = {
      current: [
        recipe("c1", "almoco"),
        recipe("c2", "almoco"),
        recipe("c3", "almoco"),
        recipe("c4", "almoco"),
      ],
      review: [
        recipe("r1", "almoco"),
        recipe("r2", "almoco"),
        recipe("r3", "almoco"),
        recipe("r4", "almoco"),
      ],
    };
    const requests = Array.from({ length: 4 }, () => ({ mealType: "almoco" as const }));
    const result = selectRecipesForItems(
      requests,
      candidates,
      { reviewRatio: 0.5 },
      rngFromSeq([0, 0, 0, 0, 0, 0, 0, 0]),
    );
    const reviewIds = new Set(["r1", "r2", "r3", "r4"]);
    const reviewCount = result.filter((r) => r.recipeId && reviewIds.has(r.recipeId)).length;
    expect(reviewCount).toBe(2);
  });

  it("falls back to the other source when the preferred one is empty for that meal type", () => {
    const candidates = {
      current: [recipe("c1", "almoco")],
      review: [recipe("r1", "jantar")],
    };
    const result = selectRecipesForItems(
      [{ mealType: "almoco" }, { mealType: "jantar" }],
      candidates,
      { reviewRatio: 1 },
      rngFromSeq([0, 0]),
    );
    expect(result[0]?.recipeId).toBe("c1");
    expect(result[1]?.recipeId).toBe("r1");
  });

  it("is deterministic with the same rng seed", () => {
    const candidates = {
      current: [recipe("a", "almoco"), recipe("b", "almoco"), recipe("c", "almoco")],
      review: [],
    };
    const requests = [
      { mealType: "almoco" as const },
      { mealType: "almoco" as const },
      { mealType: "almoco" as const },
    ];
    const r1 = selectRecipesForItems(
      requests,
      candidates,
      { reviewRatio: 0 },
      rngFromSeq([0.1, 0.4, 0.7]),
    );
    const r2 = selectRecipesForItems(
      requests,
      candidates,
      { reviewRatio: 0 },
      rngFromSeq([0.1, 0.4, 0.7]),
    );
    expect(r1.map((r) => r.recipeId)).toEqual(r2.map((r) => r.recipeId));
  });

  it("handles reviewRatio=0 by picking only from current when both are present", () => {
    const candidates = {
      current: [recipe("c1", "almoco"), recipe("c2", "almoco")],
      review: [recipe("r1", "almoco"), recipe("r2", "almoco")],
    };
    const result = selectRecipesForItems(
      [{ mealType: "almoco" }, { mealType: "almoco" }],
      candidates,
      { reviewRatio: 0 },
      rngFromSeq([0, 0]),
    );
    expect(result.every((r) => r.recipeId?.startsWith("c"))).toBe(true);
  });

  it("clamps reviewRatio outside [0,1]", () => {
    const candidates = {
      current: [recipe("c1", "almoco")],
      review: [recipe("r1", "almoco")],
    };
    const high = selectRecipesForItems(
      [{ mealType: "almoco" }],
      candidates,
      { reviewRatio: 5 },
      rngFromSeq([0]),
    );
    expect(high[0]?.recipeId).toBe("r1");

    const low = selectRecipesForItems(
      [{ mealType: "almoco" }],
      candidates,
      { reviewRatio: -1 },
      rngFromSeq([0]),
    );
    expect(low[0]?.recipeId).toBe("c1");
  });
});
