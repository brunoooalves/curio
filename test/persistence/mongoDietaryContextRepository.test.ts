import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, type Db } from "mongodb";
import { createMongoDietaryContextRepository } from "@/lib/persistence/mongo/mongoDietaryContextRepository";
import type { DietaryContextRepository } from "@/lib/persistence/repositories/dietaryContextRepository";

let mongo: MongoMemoryServer;
let client: MongoClient;
let db: Db;
let repo: DietaryContextRepository;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  client = new MongoClient(mongo.getUri());
  await client.connect();
  db = client.db("curio-test");
  repo = await createMongoDietaryContextRepository(db);
}, 60_000);

afterAll(async () => {
  await client.close();
  await mongo.stop();
});

beforeEach(async () => {
  await db.collection("dietary_contexts").deleteMany({});
});

const baseInput = {
  name: "Visita Ana e Joao",
  restrictions: ["sem gluten"],
  dislikes: ["coentro"],
  preferences: ["picante"],
  servingsOverride: 4,
};

describe("mongoDietaryContextRepository", () => {
  it("creates a context with generated id and timestamps", async () => {
    const created = await repo.create(baseInput);
    expect(created.id).toMatch(/[0-9a-f-]{36}/);
    expect(created.createdAt).toBeTruthy();
    expect(created.updatedAt).toBe(created.createdAt);
  });

  it("get returns the stored document", async () => {
    const created = await repo.create(baseInput);
    const fetched = await repo.get(created.id);
    expect(fetched?.name).toBe("Visita Ana e Joao");
    expect(await repo.get("ghost")).toBeNull();
  });

  it("list orders by updatedAt desc", async () => {
    const a = await repo.create({ ...baseInput, name: "A" });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await repo.create({ ...baseInput, name: "B" });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await repo.update(a.id, { ...baseInput, name: "A renamed" });

    const list = await repo.list();
    expect(list.map((c) => c.name)).toEqual(["A renamed", "B"]);
  });

  it("update bumps updatedAt and persists changes", async () => {
    const created = await repo.create(baseInput);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await repo.update(created.id, {
      ...baseInput,
      name: "Renomeado",
      servingsOverride: null,
    });
    const after = await repo.get(created.id);
    expect(after?.name).toBe("Renomeado");
    expect(after?.servingsOverride).toBeNull();
    expect(after?.updatedAt).not.toBe(created.updatedAt);
  });

  it("delete removes the document", async () => {
    const created = await repo.create(baseInput);
    await repo.delete(created.id);
    expect(await repo.get(created.id)).toBeNull();
  });

  it("does not leak _id to domain types", async () => {
    const created = await repo.create(baseInput);
    expect(Object.prototype.hasOwnProperty.call(created, "_id")).toBe(false);
    const fetched = await repo.get(created.id);
    expect(fetched && Object.prototype.hasOwnProperty.call(fetched, "_id")).toBe(false);
  });
});
