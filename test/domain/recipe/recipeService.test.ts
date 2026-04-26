import { describe, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import {
  getRecipesForModule,
  generateAdditionalRecipes,
} from "@/lib/domain/recipe/recipeService";
import type { Recipe } from "@/lib/domain/recipe/types";
import type { Module } from "@/lib/domain/curriculum/types";
import type { RecipeRepository } from "@/lib/persistence/repositories/recipeRepository";
import type { RecipeGenerator } from "@/lib/llm/generateRecipes";

const mod: Module = {
  id: "m1",
  weekNumber: 1,
  title: "Cortes e mise en place",
  description: "Semana de cortes e organizacao.",
  prerequisites: [],
  concepts: [
    { id: "c1.1", title: "Mise en place", description: "Organizar antes", difficulty: 1 },
  ],
};

function makeRecipe(title: string, overrides: Partial<Recipe> = {}): Recipe {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    moduleId: "m1",
    title,
    mealType: "almoco",
    servings: 2,
    estimatedMinutes: 30,
    difficulty: 2,
    ingredients: [{ name: "x", quantity: "1" }],
    steps: ["passo"],
    teachesConcepts: ["c1.1"],
    status: "sugerida",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function fakeRepo(initial: Recipe[] = []): RecipeRepository & { _store: Recipe[] } {
  const store: Recipe[] = [...initial];
  return {
    _store: store,
    findByModuleId: vi.fn(async (moduleId: string, options) => {
      const exclude = new Set(options?.excludeStatuses ?? []);
      return store.filter((r) => r.moduleId === moduleId && !exclude.has(r.status));
    }),
    findByStatus: vi.fn(async (status, options) =>
      store.filter(
        (r) => r.status === status && (!options?.moduleId || r.moduleId === options.moduleId),
      ),
    ),
    findById: vi.fn(async (id: string) => store.find((r) => r.id === id) ?? null),
    insertMany: vi.fn(async (recipes: Recipe[]) => {
      store.push(...recipes);
    }),
    updateStatus: vi.fn(async () => undefined),
  };
}

function fakeGenerator(produce: (count: number) => Recipe[]): RecipeGenerator {
  return {
    generateRecipesForModule: vi.fn(async (_m, count) => produce(count)),
  };
}

describe("getRecipesForModule", () => {
  it("returns existing recipes when there are already enough", async () => {
    const existing = Array.from({ length: 6 }, (_, i) => makeRecipe(`R${i}`));
    const repo = fakeRepo(existing);
    const gen = fakeGenerator(() => {
      throw new Error("should not be called");
    });

    const result = await getRecipesForModule(repo, gen, mod, { minCount: 6 });
    expect(result).toHaveLength(6);
    expect(gen.generateRecipesForModule).not.toHaveBeenCalled();
  });

  it("generates and persists the missing count when below threshold", async () => {
    const existing = [makeRecipe("R1"), makeRecipe("R2")];
    const repo = fakeRepo(existing);
    const gen = fakeGenerator((count) =>
      Array.from({ length: count }, (_, i) => makeRecipe(`new-${i}`)),
    );

    const result = await getRecipesForModule(repo, gen, mod, { minCount: 6 });
    expect(result).toHaveLength(6);
    expect(gen.generateRecipesForModule).toHaveBeenCalledWith(mod, 4);
    expect(repo.insertMany).toHaveBeenCalledTimes(1);
    expect(repo._store).toHaveLength(6);
  });

  it("generates the whole batch when there are no recipes yet", async () => {
    const repo = fakeRepo([]);
    const gen = fakeGenerator((count) =>
      Array.from({ length: count }, (_, i) => makeRecipe(`first-${i}`)),
    );

    const result = await getRecipesForModule(repo, gen, mod, { minCount: 6 });
    expect(result).toHaveLength(6);
    expect(gen.generateRecipesForModule).toHaveBeenCalledWith(mod, 6);
  });

  it("does not call insertMany when generator returns empty", async () => {
    const repo = fakeRepo([makeRecipe("only")]);
    const gen = fakeGenerator(() => []);

    const result = await getRecipesForModule(repo, gen, mod, { minCount: 6 });
    expect(result).toHaveLength(1);
    expect(repo.insertMany).not.toHaveBeenCalled();
  });

  it("excludes rejected recipes by default — both from output and from the threshold check", async () => {
    const existing = [
      makeRecipe("ok-1", { status: "sugerida" }),
      makeRecipe("ok-2", { status: "feita" }),
      ...Array.from({ length: 4 }, (_, i) => makeRecipe(`x-${i}`, { status: "rejeitada" })),
    ];
    const repo = fakeRepo(existing);
    const gen = fakeGenerator((count) =>
      Array.from({ length: count }, (_, i) => makeRecipe(`gen-${i}`)),
    );

    const result = await getRecipesForModule(repo, gen, mod, { minCount: 6 });
    expect(result.find((r) => r.status === "rejeitada")).toBeUndefined();
    expect(gen.generateRecipesForModule).toHaveBeenCalledWith(mod, 4);
    expect(result).toHaveLength(6);
  });
});

describe("generateAdditionalRecipes", () => {
  it("generates and persists exactly the requested count", async () => {
    const repo = fakeRepo([]);
    const gen = fakeGenerator((count) =>
      Array.from({ length: count }, (_, i) => makeRecipe(`extra-${i}`)),
    );

    const result = await generateAdditionalRecipes(repo, gen, mod, 3);
    expect(result).toHaveLength(3);
    expect(repo.insertMany).toHaveBeenCalledTimes(1);
    expect(repo._store).toHaveLength(3);
  });

  it("is a no-op for non-positive counts", async () => {
    const repo = fakeRepo([]);
    const gen = fakeGenerator(() => {
      throw new Error("should not be called");
    });

    await expect(generateAdditionalRecipes(repo, gen, mod, 0)).resolves.toEqual([]);
    expect(gen.generateRecipesForModule).not.toHaveBeenCalled();
  });
});
