import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, type Db } from "mongodb";
import { randomUUID } from "node:crypto";
import { createMongoRecipeRepository } from "@/lib/persistence/mongo/mongoRecipeRepository";
import type { Recipe } from "@/lib/domain/recipe/types";
import type { RecipeRepository } from "@/lib/persistence/repositories/recipeRepository";

let mongo: MongoMemoryServer;
let client: MongoClient;
let db: Db;
let repo: RecipeRepository;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  client = new MongoClient(mongo.getUri());
  await client.connect();
  db = client.db("curio-test");
  repo = await createMongoRecipeRepository(db);
}, 60_000);

afterAll(async () => {
  await client.close();
  await mongo.stop();
});

beforeEach(async () => {
  await db.collection("recipes").deleteMany({});
});

function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    moduleId: "m1",
    title: "Arroz branco soltinho",
    mealType: "almoco",
    servings: 2,
    estimatedMinutes: 25,
    difficulty: 2,
    ingredients: [
      { name: "Arroz", quantity: "1 xicara" },
      { name: "Agua", quantity: "2 xicaras" },
    ],
    steps: ["Lavar o arroz", "Cozinhar"],
    teachesConcepts: ["c1.1"],
    status: "sugerida",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("mongoRecipeRepository", () => {
  it("inserts and finds recipes by module id", async () => {
    const a = makeRecipe({ moduleId: "m1", title: "A" });
    const b = makeRecipe({ moduleId: "m1", title: "B" });
    const c = makeRecipe({ moduleId: "m2", title: "C" });
    await repo.insertMany([a, b, c]);

    const m1 = await repo.findByModuleId("m1");
    expect(m1).toHaveLength(2);
    expect(m1.map((r) => r.title).sort()).toEqual(["A", "B"]);

    const m2 = await repo.findByModuleId("m2");
    expect(m2).toHaveLength(1);
    expect(m2[0]?.title).toBe("C");
  });

  it("findById returns the recipe or null", async () => {
    const r = makeRecipe();
    await repo.insertMany([r]);

    const found = await repo.findById(r.id);
    expect(found?.id).toBe(r.id);

    const missing = await repo.findById("does-not-exist");
    expect(missing).toBeNull();
  });

  it("updates status and bumps updatedAt", async () => {
    const r = makeRecipe();
    await repo.insertMany([r]);

    await new Promise((resolve) => setTimeout(resolve, 5));
    await repo.updateStatus(r.id, "feita");

    const found = await repo.findById(r.id);
    expect(found?.status).toBe("feita");
    expect(found?.updatedAt).not.toBe(r.updatedAt);
  });

  it("insertMany with empty array is a no-op", async () => {
    await expect(repo.insertMany([])).resolves.toBeUndefined();
    const all = await repo.findByModuleId("m1");
    expect(all).toEqual([]);
  });

  it("does not leak _id to domain types", async () => {
    const r = makeRecipe();
    await repo.insertMany([r]);
    const found = await repo.findById(r.id);
    expect(found).not.toBeNull();
    expect(found && Object.prototype.hasOwnProperty.call(found, "_id")).toBe(false);
  });

  it("findByModuleId excludeStatuses removes matching documents", async () => {
    const sugerida = makeRecipe({ moduleId: "m1", title: "S", status: "sugerida" });
    const feita = makeRecipe({ moduleId: "m1", title: "F", status: "feita" });
    const rejeitada = makeRecipe({ moduleId: "m1", title: "R", status: "rejeitada" });
    await repo.insertMany([sugerida, feita, rejeitada]);

    const visible = await repo.findByModuleId("m1", { excludeStatuses: ["rejeitada"] });
    expect(visible.map((r) => r.title).sort()).toEqual(["F", "S"]);

    const all = await repo.findByModuleId("m1");
    expect(all).toHaveLength(3);
  });

  it("findByStatus filters and optionally narrows by module", async () => {
    await repo.insertMany([
      makeRecipe({ moduleId: "m1", title: "A", status: "rejeitada" }),
      makeRecipe({ moduleId: "m1", title: "B", status: "sugerida" }),
      makeRecipe({ moduleId: "m2", title: "C", status: "rejeitada" }),
    ]);

    const allRejected = await repo.findByStatus("rejeitada");
    expect(allRejected.map((r) => r.title).sort()).toEqual(["A", "C"]);

    const m1Rejected = await repo.findByStatus("rejeitada", { moduleId: "m1" });
    expect(m1Rejected.map((r) => r.title)).toEqual(["A"]);
  });

  it("updateStatus bumps updatedAt and persists status", async () => {
    const r = makeRecipe({ status: "sugerida" });
    await repo.insertMany([r]);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await repo.updateStatus(r.id, "feita");
    const after = await repo.findById(r.id);
    expect(after?.status).toBe("feita");
    expect(after?.updatedAt).not.toBe(r.updatedAt);
  });
});
