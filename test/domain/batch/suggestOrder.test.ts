import { describe, it, expect } from "vitest";
import {
  PERISHABLE_KEYWORDS,
  hasPerishable,
  suggestOrder,
} from "@/lib/domain/batch/suggestOrder";
import type { Recipe } from "@/lib/domain/recipe/types";

function recipe(
  id: string,
  overrides: Partial<Recipe> & { ingredients?: { name: string; quantity: string }[] } = {},
): Recipe {
  return {
    id,
    moduleId: "m1",
    title: id,
    mealType: "almoco",
    servings: 2,
    estimatedMinutes: 30,
    difficulty: 2,
    ingredients: overrides.ingredients ?? [{ name: "arroz", quantity: "1 xicara" }],
    steps: ["passo"],
    teachesConcepts: ["c1.1"],
    status: "sugerida",
    createdAt: "n",
    updatedAt: "n",
    ...overrides,
  };
}

describe("PERISHABLE_KEYWORDS", () => {
  it("includes the canonical perishables", () => {
    expect(PERISHABLE_KEYWORDS).toContain("peixe");
    expect(PERISHABLE_KEYWORDS).toContain("manjericao");
    expect(PERISHABLE_KEYWORDS).toContain("rucula");
  });
});

describe("hasPerishable", () => {
  it("matches keywords case- and accent-insensitively", () => {
    const r1 = recipe("p1", { ingredients: [{ name: "Manjericão fresco", quantity: "10 folhas" }] });
    expect(hasPerishable(r1)).toBe(true);

    const r2 = recipe("p2", { ingredients: [{ name: "RÚCULA", quantity: "1 maco" }] });
    expect(hasPerishable(r2)).toBe(true);
  });

  it("returns false when no ingredient matches", () => {
    const r = recipe("p3", {
      ingredients: [
        { name: "arroz", quantity: "1 xicara" },
        { name: "feijao", quantity: "1 xicara" },
      ],
    });
    expect(hasPerishable(r)).toBe(false);
  });

  it("matches multi-word keywords like 'frutos do mar'", () => {
    const r = recipe("p4", { ingredients: [{ name: "Mix de frutos do mar", quantity: "300 g" }] });
    expect(hasPerishable(r)).toBe(true);
  });
});

describe("suggestOrder", () => {
  it("places perishable recipes first", () => {
    const a = recipe("a", {
      ingredients: [{ name: "arroz", quantity: "1" }],
      difficulty: 2,
      estimatedMinutes: 30,
    });
    const b = recipe("b", {
      ingredients: [{ name: "manjericao", quantity: "1" }],
      difficulty: 4,
      estimatedMinutes: 60,
    });
    const result = suggestOrder([
      { request: { mealType: "almoco" }, recipe: a },
      { request: { mealType: "almoco" }, recipe: b },
    ]);
    expect(result[0]?.recipe.id).toBe("b");
    expect(result[0]?.suggestedOrder).toBe(1);
    expect(result[1]?.recipe.id).toBe("a");
    expect(result[1]?.suggestedOrder).toBe(2);
  });

  it("ties break by difficulty ascending", () => {
    const easy = recipe("easy", { difficulty: 1 });
    const hard = recipe("hard", { difficulty: 4 });
    const med = recipe("med", { difficulty: 2 });
    const result = suggestOrder([
      { request: { mealType: "almoco" }, recipe: hard },
      { request: { mealType: "almoco" }, recipe: easy },
      { request: { mealType: "almoco" }, recipe: med },
    ]);
    expect(result.map((r) => r.recipe.id)).toEqual(["easy", "med", "hard"]);
  });

  it("after difficulty, breaks by estimatedMinutes ascending", () => {
    const slow = recipe("slow", { difficulty: 2, estimatedMinutes: 90 });
    const fast = recipe("fast", { difficulty: 2, estimatedMinutes: 20 });
    const result = suggestOrder([
      { request: { mealType: "almoco" }, recipe: slow },
      { request: { mealType: "almoco" }, recipe: fast },
    ]);
    expect(result.map((r) => r.recipe.id)).toEqual(["fast", "slow"]);
  });

  it("is stable on full ties (preserves original index)", () => {
    const a = recipe("a", { difficulty: 3, estimatedMinutes: 45 });
    const b = recipe("b", { difficulty: 3, estimatedMinutes: 45 });
    const c = recipe("c", { difficulty: 3, estimatedMinutes: 45 });
    const result = suggestOrder([
      { request: { mealType: "almoco" }, recipe: a },
      { request: { mealType: "almoco" }, recipe: b },
      { request: { mealType: "almoco" }, recipe: c },
    ]);
    expect(result.map((r) => r.recipe.id)).toEqual(["a", "b", "c"]);
  });

  it("assigns contiguous suggestedOrder 1..N", () => {
    const items = [recipe("a"), recipe("b"), recipe("c"), recipe("d")];
    const result = suggestOrder(
      items.map((r) => ({ request: { mealType: "almoco" as const }, recipe: r })),
    );
    expect(result.map((r) => r.suggestedOrder)).toEqual([1, 2, 3, 4]);
  });
});
