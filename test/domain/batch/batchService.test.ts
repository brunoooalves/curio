import { describe, it, expect, vi } from "vitest";
import {
  createBatch,
  markItemDone,
  skipItem,
  replaceItemRecipe,
  reorderItems,
  listReplacementCandidates,
  type BatchServiceDeps,
} from "@/lib/domain/batch/batchService";
import type { Batch, BatchItem } from "@/lib/domain/batch/types";
import type { Recipe } from "@/lib/domain/recipe/types";
import type { Curriculum, Module } from "@/lib/domain/curriculum/types";
import type { GenerationContext } from "@/lib/domain/generation/types";
import type { BatchRepository } from "@/lib/persistence/repositories/batchRepository";
import type { RecipeRepository } from "@/lib/persistence/repositories/recipeRepository";
import type { PracticeEventRepository } from "@/lib/persistence/repositories/practiceEventRepository";
import type { RecipeGenerator } from "@/lib/llm/generateRecipes";

const ctx: GenerationContext = {
  restrictions: [],
  dislikes: [],
  preferences: [],
  abundantIngredients: [],
  servings: 2,
};

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
    steps: ["p"],
    teachesConcepts: ["c1.1"],
    status: "sugerida",
    createdAt: "n",
    updatedAt: "n",
  };
}

const curriculum: Curriculum = {
  id: "c",
  title: "C",
  description: "C",
  domain: "gastronomia",
  modules: [
    mod("m1", 1),
    mod("m2", 2, ["m1"]),
  ],
};

function mod(id: string, weekNumber: number, prerequisites: string[] = []): Module {
  return {
    id,
    weekNumber,
    title: id,
    description: id,
    prerequisites,
    concepts: [{ id: `${id}.c`, title: "c", description: "c", difficulty: 1 }],
  };
}

function fakeRecipeRepo(initial: Recipe[]): RecipeRepository & {
  _store: Map<string, Recipe>;
} {
  const store = new Map<string, Recipe>(initial.map((r) => [r.id, r]));
  return {
    _store: store,
    findById: vi.fn(async (id: string) => store.get(id) ?? null),
    findByModuleId: vi.fn(async (moduleId: string, options) => {
      const exclude = new Set(options?.excludeStatuses ?? []);
      return Array.from(store.values()).filter(
        (r) => r.moduleId === moduleId && !exclude.has(r.status),
      );
    }),
    findByStatus: vi.fn(async () => []),
    insertMany: vi.fn(async (recipes: Recipe[]) => {
      for (const r of recipes) store.set(r.id, r);
    }),
    updateStatus: vi.fn(async (id: string, status) => {
      const r = store.get(id);
      if (r) store.set(id, { ...r, status, updatedAt: new Date().toISOString() });
    }),
  };
}

function fakeBatchRepo(initial: Batch[] = []): BatchRepository & { _store: Map<string, Batch> } {
  const store = new Map<string, Batch>(initial.map((b) => [b.id, b]));
  return {
    _store: store,
    findActive: vi.fn(async () => {
      const list = Array.from(store.values())
        .filter((b) => b.items.some((i) => i.status === "pending"))
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      return list[0] ?? null;
    }),
    findById: vi.fn(async (id) => store.get(id) ?? null),
    list: vi.fn(async () =>
      Array.from(store.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    ),
    insert: vi.fn(async (batch) => {
      store.set(batch.id, batch);
    }),
    updateItemStatus: vi.fn(async (batchId, itemId, status, doneAt) => {
      const b = store.get(batchId);
      if (!b) return;
      store.set(batchId, {
        ...b,
        items: b.items.map((i) =>
          i.id === itemId ? { ...i, status, doneAt } : i,
        ),
        updatedAt: new Date().toISOString(),
      });
    }),
    replaceItemRecipe: vi.fn(async (batchId, itemId, newRecipeId) => {
      const b = store.get(batchId);
      if (!b) return;
      store.set(batchId, {
        ...b,
        items: b.items.map((i) =>
          i.id === itemId ? { ...i, recipeId: newRecipeId } : i,
        ),
        updatedAt: new Date().toISOString(),
      });
    }),
    reorderItems: vi.fn(async (batchId: string, ordered: string[]) => {
      const b = store.get(batchId);
      if (!b) return;
      const byId = new Map(b.items.map((i) => [i.id, i]));
      const reordered = ordered.map((id, idx) => ({
        ...byId.get(id)!,
        suggestedOrder: idx + 1,
      }));
      store.set(batchId, { ...b, items: reordered });
    }),
  };
}

function fakePracticeEventRepo(): PracticeEventRepository & { _events: unknown[] } {
  const events: unknown[] = [];
  return {
    _events: events,
    insert: vi.fn(async (e) => {
      events.push(e);
    }),
    listAll: vi.fn(async () => []),
    listByRecipeId: vi.fn(async () => []),
    listByModuleId: vi.fn(async () => []),
  };
}

function fakeGenerator(produce: (count: number) => Recipe[]): RecipeGenerator {
  return {
    generateRecipesForModule: vi.fn(async (_m, count) => produce(count)),
  };
}

function makeDeps(over: Partial<BatchServiceDeps> = {}): BatchServiceDeps {
  return {
    batchRepository: fakeBatchRepo(),
    recipeRepository: fakeRecipeRepo([]),
    recipeGenerator: fakeGenerator(() => []),
    practiceEventRepository: fakePracticeEventRepo(),
    curriculum,
    currentModuleId: "m1",
    completedModuleIds: [],
    ...over,
  };
}

describe("createBatch", () => {
  it("uses existing recipes when there are enough", async () => {
    const recipes = [
      recipe("a1", "almoco"),
      recipe("a2", "almoco"),
      recipe("j1", "jantar"),
    ];
    const recipeRepo = fakeRecipeRepo(recipes);
    const generator = fakeGenerator(() => {
      throw new Error("must not be called");
    });
    const deps = makeDeps({
      batchRepository: fakeBatchRepo(),
      recipeRepository: recipeRepo,
      recipeGenerator: generator,
    });

    const batch = await createBatch(deps, {
      mealsByType: { almoco: 2, jantar: 1 },
      generationContext: ctx,
    });

    expect(batch.items).toHaveLength(3);
    expect(generator.generateRecipesForModule).not.toHaveBeenCalled();
    expect(batch.mealsByType).toEqual({ cafe: 0, almoco: 2, jantar: 1, lanche: 0 });
    expect(batch.items.map((i) => i.suggestedOrder).sort()).toEqual([1, 2, 3]);
  });

  it("triggers generation once with the missing total when candidates are short", async () => {
    const recipeRepo = fakeRecipeRepo([recipe("a1", "almoco")]);
    const generator = fakeGenerator((count) =>
      Array.from({ length: count }, (_, i) => recipe(`gen-${i}`, "almoco")),
    );
    const deps = makeDeps({
      batchRepository: fakeBatchRepo(),
      recipeRepository: recipeRepo,
      recipeGenerator: generator,
    });

    const batch = await createBatch(deps, {
      mealsByType: { almoco: 4 },
      generationContext: ctx,
    });

    expect(generator.generateRecipesForModule).toHaveBeenCalledTimes(1);
    expect(batch.items).toHaveLength(4);
    expect(batch.items.every((i) => i.mealType === "almoco")).toBe(true);
  });

  it("rejects empty mealsByType", async () => {
    const deps = makeDeps();
    await expect(
      createBatch(deps, { mealsByType: {}, generationContext: ctx }),
    ).rejects.toThrowError(/pelo menos uma/);
  });

  it("snapshots generationContext into the batch", async () => {
    const recipeRepo = fakeRecipeRepo([recipe("a1", "almoco")]);
    const deps = makeDeps({
      recipeRepository: recipeRepo,
      recipeGenerator: fakeGenerator(() => []),
    });
    const customCtx: GenerationContext = { ...ctx, restrictions: ["sem gluten"], servings: 4 };
    const batch = await createBatch(deps, {
      mealsByType: { almoco: 1 },
      generationContext: customCtx,
    });
    expect(batch.generationContextSnapshot).toEqual(customCtx);
  });
});

describe("markItemDone", () => {
  it("marks item done and registers a practice event via the practice service", async () => {
    const recipes = [recipe("a1", "almoco")];
    const recipeRepo = fakeRecipeRepo(recipes);
    const eventRepo = fakePracticeEventRepo();
    const batchRepo = fakeBatchRepo();
    const deps = makeDeps({
      batchRepository: batchRepo,
      recipeRepository: recipeRepo,
      practiceEventRepository: eventRepo,
    });

    const batch = await createBatch(deps, {
      mealsByType: { almoco: 1 },
      generationContext: ctx,
    });
    const item = batch.items[0]!;

    await markItemDone(
      {
        batchRepository: batchRepo,
        recipeRepository: recipeRepo,
        practiceEventRepository: eventRepo,
      },
      batch.id,
      item.id,
      "queimei o roux",
    );

    expect(eventRepo._events).toHaveLength(1);
    const stored = batchRepo._store.get(batch.id)!;
    expect(stored.items[0]?.status).toBe("done");
    expect(stored.items[0]?.doneAt).toBeTruthy();
  });
});

describe("skipItem", () => {
  it("flips status to skipped without touching the recipe", async () => {
    const recipes = [recipe("a1", "almoco")];
    const recipeRepo = fakeRecipeRepo(recipes);
    const batchRepo = fakeBatchRepo();
    const deps = makeDeps({ batchRepository: batchRepo, recipeRepository: recipeRepo });
    const batch = await createBatch(deps, {
      mealsByType: { almoco: 1 },
      generationContext: ctx,
    });

    await skipItem({ batchRepository: batchRepo }, batch.id, batch.items[0]!.id);

    const stored = batchRepo._store.get(batch.id)!;
    expect(stored.items[0]?.status).toBe("skipped");
    expect(recipeRepo.updateStatus).not.toHaveBeenCalled();
  });
});

describe("replaceItemRecipe", () => {
  it("picks an unused candidate of the same meal type", async () => {
    const recipes = [
      recipe("a1", "almoco"),
      recipe("a2", "almoco"),
      recipe("a3", "almoco"),
    ];
    const recipeRepo = fakeRecipeRepo(recipes);
    const batchRepo = fakeBatchRepo();
    const eventRepo = fakePracticeEventRepo();
    const generator = fakeGenerator(() => []);
    const deps = makeDeps({
      batchRepository: batchRepo,
      recipeRepository: recipeRepo,
      recipeGenerator: generator,
      practiceEventRepository: eventRepo,
    });
    const batch = await createBatch(deps, {
      mealsByType: { almoco: 2 },
      generationContext: ctx,
    });
    const usedBefore = new Set(batch.items.map((i) => i.recipeId));
    const target = batch.items[0]!;

    await replaceItemRecipe(
      {
        batchRepository: batchRepo,
        recipeRepository: recipeRepo,
        practiceEventRepository: eventRepo,
        recipeGenerator: generator,
        curriculum,
        currentModuleId: "m1",
      },
      batch.id,
      target.id,
    );

    const stored = batchRepo._store.get(batch.id)!;
    const newId = stored.items.find((i) => i.id === target.id)!.recipeId;
    expect(newId).not.toBe(target.recipeId);
    expect(usedBefore.has(newId)).toBe(false);
  });

  it("falls back to generating a new recipe using the snapshot context", async () => {
    const recipes = [recipe("a1", "almoco")];
    const recipeRepo = fakeRecipeRepo(recipes);
    const batchRepo = fakeBatchRepo();
    const eventRepo = fakePracticeEventRepo();
    const generator = fakeGenerator((count) =>
      Array.from({ length: count }, (_, i) => recipe(`gen-${i}`, "almoco")),
    );
    const deps = makeDeps({
      batchRepository: batchRepo,
      recipeRepository: recipeRepo,
      recipeGenerator: generator,
      practiceEventRepository: eventRepo,
    });
    const batch = await createBatch(deps, {
      mealsByType: { almoco: 1 },
      generationContext: ctx,
    });

    await replaceItemRecipe(
      {
        batchRepository: batchRepo,
        recipeRepository: recipeRepo,
        practiceEventRepository: eventRepo,
        recipeGenerator: generator,
        curriculum,
        currentModuleId: "m1",
      },
      batch.id,
      batch.items[0]!.id,
    );

    expect(generator.generateRecipesForModule).toHaveBeenCalledTimes(1);
    const stored = batchRepo._store.get(batch.id)!;
    expect(stored.items[0]?.recipeId).toMatch(/^gen-/);
  });
});

describe("shoppingListHook", () => {
  it("recomputes after createBatch / done / skip / replace, but NOT after reorder", async () => {
    const recipes = [
      recipe("a1", "almoco"),
      recipe("a2", "almoco"),
      recipe("a3", "almoco"),
    ];
    const recipeRepo = fakeRecipeRepo(recipes);
    const batchRepo = fakeBatchRepo();
    const eventRepo = fakePracticeEventRepo();
    const generator = fakeGenerator(() => []);
    const hook = { recompute: vi.fn(async () => undefined) };
    const deps = makeDeps({
      batchRepository: batchRepo,
      recipeRepository: recipeRepo,
      practiceEventRepository: eventRepo,
      recipeGenerator: generator,
      shoppingListHook: hook,
    });

    const batch = await createBatch(deps, {
      mealsByType: { almoco: 2 },
      generationContext: ctx,
    });
    expect(hook.recompute).toHaveBeenCalledTimes(1);

    const fullDeps = {
      batchRepository: batchRepo,
      recipeRepository: recipeRepo,
      practiceEventRepository: eventRepo,
      recipeGenerator: generator,
      curriculum,
      currentModuleId: "m1",
      shoppingListHook: hook,
    };

    await markItemDone(fullDeps, batch.id, batch.items[0]!.id, null);
    expect(hook.recompute).toHaveBeenCalledTimes(2);

    await skipItem(fullDeps, batch.id, batch.items[1]!.id);
    expect(hook.recompute).toHaveBeenCalledTimes(3);

    await replaceItemRecipe(fullDeps, batch.id, batch.items[0]!.id);
    expect(hook.recompute).toHaveBeenCalledTimes(4);

    const reversed = [...batch.items].reverse().map((i) => i.id);
    await reorderItems(fullDeps, batch.id, reversed);
    expect(hook.recompute).toHaveBeenCalledTimes(4);
  });

  it("logs but does not throw when hook recompute fails", async () => {
    const recipes = [recipe("a1", "almoco")];
    const recipeRepo = fakeRecipeRepo(recipes);
    const generator = fakeGenerator(() => []);
    const hook = { recompute: vi.fn(async () => { throw new Error("boom"); }) };
    const deps = makeDeps({
      recipeRepository: recipeRepo,
      recipeGenerator: generator,
      shoppingListHook: hook,
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      await expect(
        createBatch(deps, {
          mealsByType: { almoco: 1 },
          generationContext: ctx,
        }),
      ).resolves.not.toThrow();
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});

describe("listReplacementCandidates", () => {
  it("returns same-mealType, non-used recipes from the current module", async () => {
    const recipes = [
      recipe("a1", "almoco"),
      recipe("a2", "almoco"),
      recipe("a3", "almoco"),
      recipe("j1", "jantar"),
    ];
    const recipeRepo = fakeRecipeRepo(recipes);
    const batchRepo = fakeBatchRepo();
    const deps = makeDeps({ batchRepository: batchRepo, recipeRepository: recipeRepo });
    const batch = await createBatch(deps, {
      mealsByType: { almoco: 2 },
      generationContext: ctx,
    });

    const target = batch.items[0]!;
    const candidates = await listReplacementCandidates(
      { batchRepository: batchRepo, recipeRepository: recipeRepo, currentModuleId: "m1" },
      batch.id,
      target.id,
    );
    expect(candidates.every((r) => r.mealType === "almoco")).toBe(true);
    const otherUsed = batch.items.find((i) => i.id !== target.id)!.recipeId;
    expect(candidates.find((r) => r.id === otherUsed)).toBeUndefined();
    expect(candidates.find((r) => r.id === target.recipeId)).toBeDefined();
  });
});

describe("reorderItems", () => {
  it("renumbers suggestedOrder according to input", async () => {
    const recipes = [
      recipe("a1", "almoco"),
      recipe("a2", "almoco"),
      recipe("a3", "almoco"),
    ];
    const recipeRepo = fakeRecipeRepo(recipes);
    const batchRepo = fakeBatchRepo();
    const deps = makeDeps({ batchRepository: batchRepo, recipeRepository: recipeRepo });
    const batch = await createBatch(deps, {
      mealsByType: { almoco: 3 },
      generationContext: ctx,
    });

    const reversed = [...batch.items].reverse().map((i: BatchItem) => i.id);
    await reorderItems({ batchRepository: batchRepo }, batch.id, reversed);

    const stored = batchRepo._store.get(batch.id)!;
    const sorted = [...stored.items].sort((a, b) => a.suggestedOrder - b.suggestedOrder);
    expect(sorted.map((i) => i.id)).toEqual(reversed);
  });
});
