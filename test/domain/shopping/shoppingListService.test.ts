import { describe, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import {
  buildOrUpdateForBatch,
  markItem,
  ShoppingListNotFoundError,
} from "@/lib/domain/shopping/shoppingListService";
import type { Batch, BatchItem } from "@/lib/domain/batch/types";
import type { Recipe } from "@/lib/domain/recipe/types";
import type { BatchRepository } from "@/lib/persistence/repositories/batchRepository";
import type { RecipeRepository } from "@/lib/persistence/repositories/recipeRepository";
import type { ShoppingListRepository } from "@/lib/persistence/repositories/shoppingListRepository";
import type { ShoppingList } from "@/lib/domain/shopping/types";

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

function batchWith(items: BatchItem[]): Batch {
  return {
    id: "b1",
    mealsByType: { cafe: 0, almoco: items.length, jantar: 0, lanche: 0 },
    items,
    generationContextSnapshot: null,
    createdAt: "n",
    updatedAt: "n",
  };
}

function item(recipeId: string, status: BatchItem["status"] = "pending"): BatchItem {
  return {
    id: randomUUID(),
    mealType: "almoco",
    recipeId,
    suggestedOrder: 1,
    status,
    doneAt: status === "done" ? "n" : null,
  };
}

const fakeNormalize = async (rawNames: string[]) => {
  const map = new Map<string, { canonical: string; defaultUnit: string | null }>();
  for (const raw of rawNames) {
    const trimmed = raw.trim();
    map.set(trimmed, { canonical: trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase(), defaultUnit: "g" });
  }
  return map;
};

function fakeShoppingRepo(): ShoppingListRepository & { _store: Map<string, ShoppingList> } {
  const store = new Map<string, ShoppingList>();
  return {
    _store: store,
    findByBatchId: vi.fn(async (batchId: string) => {
      for (const list of store.values()) if (list.batchId === batchId) return list;
      return null;
    }),
    upsert: vi.fn(async (list: ShoppingList) => {
      store.set(list.id, list);
    }),
    updateItemStatus: vi.fn(async (listId, itemId, status, updatedAt) => {
      const list = store.get(listId);
      if (!list) return;
      store.set(listId, {
        ...list,
        items: list.items.map((i) =>
          i.id === itemId ? { ...i, status, updatedAt } : i,
        ),
        updatedAt,
      });
    }),
  };
}

function fakeBatchRepo(batch: Batch | null): BatchRepository {
  return {
    findActive: vi.fn(async () => null),
    findById: vi.fn(async (id) => (batch && batch.id === id ? batch : null)),
    list: vi.fn(async () => (batch ? [batch] : [])),
    insert: vi.fn(),
    updateItemStatus: vi.fn(),
    replaceItemRecipe: vi.fn(),
    reorderItems: vi.fn(),
  };
}

function fakeRecipeRepo(recipes: Recipe[]): RecipeRepository {
  const store = new Map(recipes.map((r) => [r.id, r]));
  return {
    findById: vi.fn(async (id: string) => store.get(id) ?? null),
    findByModuleId: vi.fn(async () => recipes),
    findByStatus: vi.fn(async () => []),
    insertMany: vi.fn(),
    updateStatus: vi.fn(),
  };
}

describe("buildOrUpdateForBatch", () => {
  it("creates a list with pending items aggregated from recipes", async () => {
    const recipes = [
      recipe("r1", [
        { name: "tomate", quantity: "200 g" },
        { name: "sal", quantity: "a gosto" },
      ]),
      recipe("r2", [
        { name: "tomate", quantity: "300 g" },
        { name: "azeite", quantity: "30 ml" },
      ]),
    ];
    const batch = batchWith([item("r1"), item("r2")]);
    const shoppingRepo = fakeShoppingRepo();
    const list = await buildOrUpdateForBatch(
      {
        shoppingListRepository: shoppingRepo,
        batchRepository: fakeBatchRepo(batch),
        recipeRepository: fakeRecipeRepo(recipes),
        normalize: fakeNormalize,
      },
      batch.id,
    );
    expect(list.items.map((i) => i.canonicalName).sort()).toEqual([
      "Azeite",
      "Sal",
      "Tomate",
    ]);
    const tomato = list.items.find((i) => i.canonicalName === "Tomate")!;
    expect(tomato.aggregatedQuantity).toEqual({ kind: "sum", value: 500, unit: "g" });
    expect(list.items.every((i) => i.status === "pending")).toBe(true);
  });

  it("filters out non-pending batch items from the list", async () => {
    const recipes = [
      recipe("r1", [{ name: "tomate", quantity: "200 g" }]),
      recipe("r2", [{ name: "cebola", quantity: "1 unidade" }]),
    ];
    const batch = batchWith([item("r1", "done"), item("r2")]);
    const list = await buildOrUpdateForBatch(
      {
        shoppingListRepository: fakeShoppingRepo(),
        batchRepository: fakeBatchRepo(batch),
        recipeRepository: fakeRecipeRepo(recipes),
        normalize: fakeNormalize,
      },
      batch.id,
    );
    expect(list.items.map((i) => i.canonicalName)).toEqual(["Cebola"]);
  });

  it("preserves non-pending status across recomputations and drops orphans", async () => {
    const recipes1 = [
      recipe("r1", [
        { name: "tomate", quantity: "200 g" },
        { name: "sal", quantity: "a gosto" },
      ]),
    ];
    const batch1 = batchWith([item("r1")]);
    const shoppingRepo = fakeShoppingRepo();
    const deps = {
      shoppingListRepository: shoppingRepo,
      batchRepository: fakeBatchRepo(batch1),
      recipeRepository: fakeRecipeRepo(recipes1),
      normalize: fakeNormalize,
    };
    const first = await buildOrUpdateForBatch(deps, batch1.id);
    const tomateItem = first.items.find((i) => i.canonicalName === "Tomate")!;
    await shoppingRepo.updateItemStatus(first.id, tomateItem.id, "bought", "x");

    const recipes2 = [
      recipe("r2", [
        { name: "tomate", quantity: "100 g" },
        { name: "azeite", quantity: "30 ml" },
      ]),
    ];
    const batch2 = batchWith([item("r2")]);
    const second = await buildOrUpdateForBatch(
      {
        ...deps,
        batchRepository: fakeBatchRepo({ ...batch2, id: batch1.id }),
        recipeRepository: fakeRecipeRepo(recipes2),
      },
      batch1.id,
    );
    const persistedTomate = second.items.find((i) => i.canonicalName === "Tomate");
    expect(persistedTomate?.id).toBe(tomateItem.id);
    expect(persistedTomate?.status).toBe("bought");
    const sal = second.items.find((i) => i.canonicalName === "Sal");
    expect(sal).toBeUndefined();
    const azeite = second.items.find((i) => i.canonicalName === "Azeite");
    expect(azeite?.status).toBe("pending");
  });

  it("throws when the batch does not exist", async () => {
    await expect(
      buildOrUpdateForBatch(
        {
          shoppingListRepository: fakeShoppingRepo(),
          batchRepository: fakeBatchRepo(null),
          recipeRepository: fakeRecipeRepo([]),
          normalize: fakeNormalize,
        },
        "ghost",
      ),
    ).rejects.toThrowError(/nao encontrado/i);
  });
});

describe("markItem", () => {
  it("flips status of the targeted item", async () => {
    const recipes = [recipe("r1", [{ name: "tomate", quantity: "200 g" }])];
    const batch = batchWith([item("r1")]);
    const shoppingRepo = fakeShoppingRepo();
    const list = await buildOrUpdateForBatch(
      {
        shoppingListRepository: shoppingRepo,
        batchRepository: fakeBatchRepo(batch),
        recipeRepository: fakeRecipeRepo(recipes),
        normalize: fakeNormalize,
      },
      batch.id,
    );
    const target = list.items[0]!;
    await markItem(
      { shoppingListRepository: shoppingRepo },
      batch.id,
      target.id,
      "bought",
    );
    const stored = shoppingRepo._store.get(list.id)!;
    expect(stored.items[0]?.status).toBe("bought");
  });

  it("throws when the list is missing", async () => {
    await expect(
      markItem(
        { shoppingListRepository: fakeShoppingRepo() },
        "ghost",
        "i1",
        "bought",
      ),
    ).rejects.toBeInstanceOf(ShoppingListNotFoundError);
  });
});
