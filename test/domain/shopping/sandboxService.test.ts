import { describe, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import {
  applyAsBatch,
  previewReplacement,
  previewShoppingList,
} from "@/lib/domain/shopping/sandboxService";
import type { Batch, BatchItem } from "@/lib/domain/batch/types";
import type { Recipe } from "@/lib/domain/recipe/types";
import type { Curriculum, Module } from "@/lib/domain/curriculum/types";
import type { GenerationContext } from "@/lib/domain/generation/types";
import type { BatchRepository } from "@/lib/persistence/repositories/batchRepository";
import type { RecipeRepository } from "@/lib/persistence/repositories/recipeRepository";
import type { PracticeEventRepository } from "@/lib/persistence/repositories/practiceEventRepository";

function recipe(
  id: string,
  mealType: Recipe["mealType"],
  ingredients: { name: string; quantity: string }[],
): Recipe {
  return {
    id,
    moduleId: "m1",
    title: id,
    mealType,
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

function fakeRecipeRepo(recipes: Recipe[]): RecipeRepository {
  const store = new Map(recipes.map((r) => [r.id, r]));
  return {
    findById: vi.fn(async (id: string) => store.get(id) ?? null),
    findByModuleId: vi.fn(async () => recipes),
    findByStatus: vi.fn(async () => []),
    insertMany: vi.fn(async (rs: Recipe[]) => {
      for (const r of rs) store.set(r.id, r);
    }),
    updateStatus: vi.fn(),
  };
}

function fakeBatchRepo(initial: Batch[] = []): BatchRepository & { _store: Map<string, Batch> } {
  const store = new Map<string, Batch>(initial.map((b) => [b.id, b]));
  return {
    _store: store,
    findActive: vi.fn(async () =>
      Array.from(store.values())[0] ?? null,
    ),
    findById: vi.fn(async (id) => store.get(id) ?? null),
    list: vi.fn(async () => Array.from(store.values())),
    insert: vi.fn(async (b) => {
      store.set(b.id, b);
    }),
    updateItemStatus: vi.fn(),
    replaceItemRecipe: vi.fn(),
    reorderItems: vi.fn(),
  };
}

function fakeEventRepo(): PracticeEventRepository {
  return {
    insert: vi.fn(),
    listAll: vi.fn(async () => []),
    listByRecipeId: vi.fn(async () => []),
    listByModuleId: vi.fn(async () => []),
  };
}

const fakeNormalize = async (rawNames: string[]) => {
  const map = new Map<string, { canonical: string; defaultUnit: string | null }>();
  for (const raw of rawNames) {
    const trimmed = raw.trim();
    map.set(trimmed, {
      canonical: trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase(),
      defaultUnit: "g",
    });
  }
  return map;
};

const ctx: GenerationContext = {
  restrictions: [],
  dislikes: [],
  preferences: [],
  abundantIngredients: [],
  servings: 2,
};

const curriculum: Curriculum = {
  id: "c",
  title: "C",
  description: "C",
  domain: "gastronomia",
  modules: [
    {
      id: "m1",
      weekNumber: 1,
      title: "M1",
      description: "M1",
      prerequisites: [],
      concepts: [{ id: "c1.1", title: "c", description: "c", difficulty: 1 }],
    } satisfies Module,
  ],
};

describe("previewShoppingList", () => {
  it("aggregates ingredients across selected recipes without persistence", async () => {
    const recipes = [
      recipe("r1", "almoco", [{ name: "tomate", quantity: "200 g" }]),
      recipe("r2", "almoco", [{ name: "tomate", quantity: "300 g" }]),
    ];
    const lines = await previewShoppingList(
      { recipeRepository: fakeRecipeRepo(recipes), normalize: fakeNormalize },
      ["r1", "r2"],
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]?.aggregatedQuantity).toEqual({ kind: "sum", value: 500, unit: "g" });
  });
});

describe("applyAsBatch", () => {
  it("creates a batch with mealsByType counted from selected recipes (no generation)", async () => {
    const recipes = [
      recipe("a1", "almoco", [{ name: "tomate", quantity: "200 g" }]),
      recipe("a2", "almoco", [{ name: "azeite", quantity: "30 ml" }]),
      recipe("j1", "jantar", [{ name: "sal", quantity: "a gosto" }]),
    ];
    const batchRepo = fakeBatchRepo();
    const batch = await applyAsBatch(
      {
        batchRepository: batchRepo,
        recipeRepository: fakeRecipeRepo(recipes),
        recipeGenerator: { async generateRecipesForModule() { throw new Error("must not call"); } },
        practiceEventRepository: fakeEventRepo(),
        curriculum,
        currentModuleId: "m1",
        completedModuleIds: [],
      },
      ["a1", "a2", "j1"],
      ctx,
    );
    expect(batch.mealsByType).toEqual({ cafe: 0, almoco: 2, jantar: 1, lanche: 0 });
    expect(batch.items).toHaveLength(3);
    expect(batchRepo._store.has(batch.id)).toBe(true);
  });

  it("rejects empty selection", async () => {
    await expect(
      applyAsBatch(
        {
          batchRepository: fakeBatchRepo(),
          recipeRepository: fakeRecipeRepo([]),
          recipeGenerator: { async generateRecipesForModule() { return []; } },
          practiceEventRepository: fakeEventRepo(),
          curriculum,
          currentModuleId: "m1",
          completedModuleIds: [],
        },
        [],
        ctx,
      ),
    ).rejects.toThrowError(/ao menos uma/);
  });
});

describe("previewReplacement", () => {
  it("returns before/after/diff reflecting the substitution", async () => {
    const recipes = [
      recipe("r1", "almoco", [{ name: "tomate", quantity: "200 g" }]),
      recipe("r2", "almoco", [{ name: "tomate", quantity: "300 g" }]),
      recipe("alt", "almoco", [{ name: "cebola", quantity: "1 unidade" }]),
    ];
    const item: BatchItem = {
      id: randomUUID(),
      mealType: "almoco",
      recipeId: "r1",
      suggestedOrder: 1,
      status: "pending",
      doneAt: null,
    };
    const item2: BatchItem = { ...item, id: randomUUID(), recipeId: "r2", suggestedOrder: 2 };
    const batch: Batch = {
      id: "b1",
      mealsByType: { cafe: 0, almoco: 2, jantar: 0, lanche: 0 },
      items: [item, item2],
      generationContextSnapshot: ctx,
      createdAt: "n",
      updatedAt: "n",
    };
    const result = await previewReplacement(
      {
        batchRepository: fakeBatchRepo([batch]),
        recipeRepository: fakeRecipeRepo(recipes),
        normalize: fakeNormalize,
      },
      "b1",
      item.id,
      "alt",
    );

    expect(result.before.find((l) => l.canonicalName === "Tomate")?.aggregatedQuantity).toEqual(
      { kind: "sum", value: 500, unit: "g" },
    );
    expect(result.after.find((l) => l.canonicalName === "Tomate")?.aggregatedQuantity).toEqual(
      { kind: "sum", value: 300, unit: "g" },
    );
    expect(result.diff.added.map((l) => l.canonicalName)).toEqual(["Cebola"]);
    expect(result.diff.changed.map((c) => c.after.canonicalName)).toEqual(["Tomate"]);
  });
});
