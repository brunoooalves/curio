import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, type Db } from "mongodb";
import { createMongoIngredientRepository } from "@/lib/persistence/mongo/mongoIngredientRepository";
import type { IngredientRepository } from "@/lib/persistence/repositories/ingredientRepository";

let mongo: MongoMemoryServer;
let client: MongoClient;
let db: Db;
let repo: IngredientRepository;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  client = new MongoClient(mongo.getUri());
  await client.connect();
  db = client.db("curio-test");
  repo = await createMongoIngredientRepository(db);
}, 60_000);

afterAll(async () => {
  await client.close();
  await mongo.stop();
});

beforeEach(async () => {
  await db.collection("ingredients").deleteMany({});
});

describe("mongoIngredientRepository", () => {
  it("upsert creates a new ingredient and is idempotent", async () => {
    const a = await repo.upsert("Tomate", ["tomatinho"], "g");
    expect(a.canonicalName).toBe("Tomate");
    expect(a.defaultUnit).toBe("g");

    const b = await repo.upsert("Tomate", ["tomatinho"], "g");
    expect(b.aliases).toEqual(a.aliases);
    expect(b.createdAt).toBe(a.createdAt);
  });

  it("upsert merges aliases without duplicating", async () => {
    await repo.upsert("Tomate", ["tomatinho"], "g");
    const merged = await repo.upsert("Tomate", ["tomate cereja", "tomatinho"]);
    const aliasSet = new Set(merged.aliases);
    expect(aliasSet.has("tomate cereja")).toBe(true);
    expect(aliasSet.has("tomatinho")).toBe(true);
    expect(merged.aliases.length).toBe(aliasSet.size);
  });

  it("findByAlias is case- and accent-insensitive and trims", async () => {
    await repo.upsert("Manjericão", ["folhas de manjericao"], "g");

    expect((await repo.findByAlias("manjericao"))?.canonicalName).toBe("Manjericão");
    expect((await repo.findByAlias("MANJERICÃO"))?.canonicalName).toBe("Manjericão");
    expect((await repo.findByAlias("  Folhas de Manjericão  "))?.canonicalName).toBe(
      "Manjericão",
    );
    expect(await repo.findByAlias("ghost")).toBeNull();
  });

  it("findByCanonical retrieves by canonical name (insensitive)", async () => {
    await repo.upsert("Azeite", []);
    expect((await repo.findByCanonical("azeite"))?.canonicalName).toBe("Azeite");
  });

  it("list returns ingredients sorted by canonical name", async () => {
    await repo.upsert("Cebola", []);
    await repo.upsert("Alho", []);
    await repo.upsert("Tomate", []);
    const list = await repo.list();
    expect(list.map((i) => i.canonicalName)).toEqual(["Alho", "Cebola", "Tomate"]);
  });

  it("does not leak _id to domain types", async () => {
    const ing = await repo.upsert("Sal", []);
    expect(Object.prototype.hasOwnProperty.call(ing, "_id")).toBe(false);
  });
});
