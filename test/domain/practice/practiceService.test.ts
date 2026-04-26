import { describe, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import {
  markCompleted,
  markRejected,
  revert,
  getHistoryView,
  RecipeNotFoundError,
} from "@/lib/domain/practice/practiceService";
import type { Recipe } from "@/lib/domain/recipe/types";
import type { PracticeEvent } from "@/lib/domain/practice/types";
import type { RecipeRepository } from "@/lib/persistence/repositories/recipeRepository";
import type { PracticeEventRepository } from "@/lib/persistence/repositories/practiceEventRepository";

function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    moduleId: "m1",
    title: "Arroz",
    mealType: "almoco",
    servings: 2,
    estimatedMinutes: 25,
    difficulty: 2,
    ingredients: [{ name: "arroz", quantity: "1 xicara" }],
    steps: ["cozinhar"],
    teachesConcepts: ["c1.1"],
    status: "sugerida",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function fakeRecipeRepo(initial: Recipe[] = []): RecipeRepository {
  const store = new Map<string, Recipe>(initial.map((r) => [r.id, r]));
  return {
    findById: vi.fn(async (id: string) => store.get(id) ?? null),
    findByModuleId: vi.fn(async () => Array.from(store.values())),
    findByStatus: vi.fn(async () => []),
    insertMany: vi.fn(async () => undefined),
    updateStatus: vi.fn(async (id: string, status) => {
      const r = store.get(id);
      if (r) store.set(id, { ...r, status, updatedAt: new Date().toISOString() });
    }),
  };
}

function fakeEventRepo(initial: PracticeEvent[] = []): PracticeEventRepository & {
  _events: PracticeEvent[];
} {
  const events: PracticeEvent[] = [...initial];
  return {
    _events: events,
    insert: vi.fn(async (event: PracticeEvent) => {
      events.push(event);
    }),
    listAll: vi.fn(async (options) => {
      let out = [...events].sort((a, b) =>
        a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0,
      );
      if (options?.types && options.types.length > 0) {
        out = out.filter((e) => options.types!.includes(e.type));
      }
      if (options?.limit && options.limit > 0) out = out.slice(0, options.limit);
      return out;
    }),
    listByRecipeId: vi.fn(async (recipeId: string) =>
      events.filter((e) => e.recipeId === recipeId),
    ),
    listByModuleId: vi.fn(async (moduleId: string) =>
      events.filter((e) => e.moduleId === moduleId),
    ),
  };
}

describe("markCompleted", () => {
  it("updates status to feita and inserts a completed event with reflection", async () => {
    const r = makeRecipe();
    const recipeRepo = fakeRecipeRepo([r]);
    const eventRepo = fakeEventRepo();

    await markCompleted(recipeRepo, eventRepo, r.id, "queimei o roux mas aprendi");

    expect(recipeRepo.updateStatus).toHaveBeenCalledWith(r.id, "feita");
    expect(eventRepo.insert).toHaveBeenCalledTimes(1);
    const event = eventRepo._events[0]!;
    expect(event.type).toBe("completed");
    expect(event.recipeId).toBe(r.id);
    expect(event.moduleId).toBe(r.moduleId);
    expect(event.reflection).toBe("queimei o roux mas aprendi");
  });

  it("accepts null reflection", async () => {
    const r = makeRecipe();
    const recipeRepo = fakeRecipeRepo([r]);
    const eventRepo = fakeEventRepo();

    await markCompleted(recipeRepo, eventRepo, r.id, null);
    expect(eventRepo._events[0]?.reflection).toBeNull();
  });

  it("throws RecipeNotFoundError when recipe is missing", async () => {
    const recipeRepo = fakeRecipeRepo([]);
    const eventRepo = fakeEventRepo();
    await expect(markCompleted(recipeRepo, eventRepo, "ghost", null)).rejects.toBeInstanceOf(
      RecipeNotFoundError,
    );
    expect(recipeRepo.updateStatus).not.toHaveBeenCalled();
    expect(eventRepo.insert).not.toHaveBeenCalled();
  });
});

describe("markRejected", () => {
  it("updates status to rejeitada and inserts a rejected event with null reflection", async () => {
    const r = makeRecipe();
    const recipeRepo = fakeRecipeRepo([r]);
    const eventRepo = fakeEventRepo();

    await markRejected(recipeRepo, eventRepo, r.id);

    expect(recipeRepo.updateStatus).toHaveBeenCalledWith(r.id, "rejeitada");
    const event = eventRepo._events[0]!;
    expect(event.type).toBe("rejected");
    expect(event.reflection).toBeNull();
  });
});

describe("revert", () => {
  it("updates status to sugerida and inserts a reverted event", async () => {
    const r = makeRecipe({ status: "feita" });
    const recipeRepo = fakeRecipeRepo([r]);
    const eventRepo = fakeEventRepo();

    await revert(recipeRepo, eventRepo, r.id);

    expect(recipeRepo.updateStatus).toHaveBeenCalledWith(r.id, "sugerida");
    expect(eventRepo._events[0]?.type).toBe("reverted");
  });
});

describe("getHistoryView", () => {
  it("enriches events with recipe snapshot", async () => {
    const r = makeRecipe({ title: "Salada" });
    const recipeRepo = fakeRecipeRepo([r]);
    const eventRepo = fakeEventRepo();
    await markCompleted(recipeRepo, eventRepo, r.id, "ok");

    const view = await getHistoryView(recipeRepo, eventRepo);
    expect(view).toHaveLength(1);
    expect(view[0]?.recipe).toEqual({ id: r.id, title: "Salada", mealType: "almoco" });
    expect(view[0]?.event.type).toBe("completed");
  });

  it("yields recipe=null when the recipe was deleted (defensive)", async () => {
    const r = makeRecipe();
    const recipeRepo = fakeRecipeRepo([r]);
    const eventRepo = fakeEventRepo();
    await markCompleted(recipeRepo, eventRepo, r.id, null);

    const orphanRepo = fakeRecipeRepo([]);
    const view = await getHistoryView(orphanRepo, eventRepo);
    expect(view[0]?.recipe).toBeNull();
  });

  it("passes type filter and limit through to the repository", async () => {
    const r = makeRecipe();
    const recipeRepo = fakeRecipeRepo([r]);
    const eventRepo = fakeEventRepo();
    await markCompleted(recipeRepo, eventRepo, r.id, null);
    await markRejected(recipeRepo, eventRepo, r.id);

    const view = await getHistoryView(recipeRepo, eventRepo, { types: ["completed"] });
    expect(view).toHaveLength(1);
    expect(view[0]?.event.type).toBe("completed");
  });
});
