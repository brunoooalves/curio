import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, type Db } from "mongodb";
import { randomUUID } from "node:crypto";
import { createMongoShoppingListRepository } from "@/lib/persistence/mongo/mongoShoppingListRepository";
import type { ShoppingList } from "@/lib/domain/shopping/types";
import type { ShoppingListRepository } from "@/lib/persistence/repositories/shoppingListRepository";

let mongo: MongoMemoryServer;
let client: MongoClient;
let db: Db;
let repo: ShoppingListRepository;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  client = new MongoClient(mongo.getUri());
  await client.connect();
  db = client.db("curio-test");
  repo = await createMongoShoppingListRepository(db);
}, 60_000);

afterAll(async () => {
  await client.close();
  await mongo.stop();
});

beforeEach(async () => {
  await db.collection("shopping_lists").deleteMany({});
});

function makeList(batchId: string): ShoppingList {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    batchId,
    items: [
      {
        id: randomUUID(),
        canonicalName: "Tomate",
        aggregatedQuantity: { kind: "sum", value: 200, unit: "g" },
        sourceRecipeIds: ["r1"],
        status: "pending",
        updatedAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

describe("mongoShoppingListRepository", () => {
  it("upsert inserts then replaces", async () => {
    const list = makeList("batch-1");
    await repo.upsert(list);
    const fetched = await repo.findByBatchId("batch-1");
    expect(fetched?.id).toBe(list.id);
    expect(fetched?.items).toHaveLength(1);

    const replaced: ShoppingList = { ...list, items: [...list.items, list.items[0]!] };
    await repo.upsert(replaced);
    const after = await repo.findByBatchId("batch-1");
    expect(after?.items).toHaveLength(2);
  });

  it("findByBatchId returns null for unknown batch", async () => {
    expect(await repo.findByBatchId("ghost")).toBeNull();
  });

  it("updateItemStatus updates target item only", async () => {
    const list = makeList("batch-1");
    await repo.upsert(list);
    const itemId = list.items[0]!.id;
    await repo.updateItemStatus(list.id, itemId, "bought", "2026-04-26T00:00:00.000Z");
    const after = await repo.findByBatchId("batch-1");
    expect(after?.items[0]?.status).toBe("bought");
    expect(after?.items[0]?.updatedAt).toBe("2026-04-26T00:00:00.000Z");
  });

  it("enforces unique batchId via index", async () => {
    const a = makeList("dup");
    const b = makeList("dup");
    await repo.upsert(a);
    await expect(repo.upsert(b)).rejects.toThrow();
  });

  it("does not leak _id to domain types", async () => {
    const list = makeList("batch-1");
    await repo.upsert(list);
    const fetched = await repo.findByBatchId("batch-1");
    expect(Object.prototype.hasOwnProperty.call(fetched, "_id")).toBe(false);
  });
});
