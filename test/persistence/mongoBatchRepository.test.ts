import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, type Db } from "mongodb";
import { randomUUID } from "node:crypto";
import { createMongoBatchRepository } from "@/lib/persistence/mongo/mongoBatchRepository";
import type { Batch, BatchItem } from "@/lib/domain/batch/types";
import type { BatchRepository } from "@/lib/persistence/repositories/batchRepository";

let mongo: MongoMemoryServer;
let client: MongoClient;
let db: Db;
let repo: BatchRepository;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  client = new MongoClient(mongo.getUri());
  await client.connect();
  db = client.db("curio-test");
  repo = await createMongoBatchRepository(db);
}, 60_000);

afterAll(async () => {
  await client.close();
  await mongo.stop();
});

beforeEach(async () => {
  await db.collection("batches").deleteMany({});
});

function makeItem(order: number, overrides: Partial<BatchItem> = {}): BatchItem {
  return {
    id: randomUUID(),
    mealType: "almoco",
    recipeId: `r-${order}`,
    suggestedOrder: order,
    status: "pending",
    doneAt: null,
    ...overrides,
  };
}

function makeBatch(items: BatchItem[], createdAt = new Date().toISOString()): Batch {
  return {
    id: randomUUID(),
    mealsByType: { cafe: 0, almoco: items.length, jantar: 0, lanche: 0 },
    items,
    generationContextSnapshot: null,
    createdAt,
    updatedAt: createdAt,
  };
}

describe("mongoBatchRepository", () => {
  it("inserts and finds by id", async () => {
    const batch = makeBatch([makeItem(1), makeItem(2)]);
    await repo.insert(batch);
    const found = await repo.findById(batch.id);
    expect(found?.id).toBe(batch.id);
    expect(found?.items).toHaveLength(2);
  });

  it("findActive returns the most recent batch with at least one pending item", async () => {
    const old = makeBatch([makeItem(1, { status: "done", doneAt: "x" })], "2026-01-01");
    const middle = makeBatch([makeItem(1)], "2026-02-01");
    const newer = makeBatch(
      [makeItem(1, { status: "done", doneAt: "x" }), makeItem(2, { status: "skipped" })],
      "2026-03-01",
    );
    await repo.insert(old);
    await repo.insert(middle);
    await repo.insert(newer);

    const active = await repo.findActive();
    expect(active?.id).toBe(middle.id);
  });

  it("findActive returns null when nothing is pending anywhere", async () => {
    const a = makeBatch([makeItem(1, { status: "done", doneAt: "x" })], "2026-01-01");
    await repo.insert(a);
    expect(await repo.findActive()).toBeNull();
  });

  it("list orders by createdAt desc", async () => {
    await repo.insert(makeBatch([makeItem(1)], "2026-01-01"));
    await repo.insert(makeBatch([makeItem(1)], "2026-02-01"));
    await repo.insert(makeBatch([makeItem(1)], "2026-01-15"));
    const list = await repo.list();
    expect(list.map((b) => b.createdAt)).toEqual(["2026-02-01", "2026-01-15", "2026-01-01"]);
  });

  it("updateItemStatus updates target item only and bumps updatedAt", async () => {
    const items = [makeItem(1), makeItem(2)];
    const batch = makeBatch(items);
    await repo.insert(batch);

    await repo.updateItemStatus(batch.id, items[0]!.id, "done", "2026-04-26T00:00:00.000Z");
    const after = await repo.findById(batch.id);
    expect(after?.items.find((i) => i.id === items[0]!.id)?.status).toBe("done");
    expect(after?.items.find((i) => i.id === items[0]!.id)?.doneAt).toBe(
      "2026-04-26T00:00:00.000Z",
    );
    expect(after?.items.find((i) => i.id === items[1]!.id)?.status).toBe("pending");
    expect(after?.updatedAt).not.toBe(batch.updatedAt);
  });

  it("replaceItemRecipe swaps recipeId for the target item", async () => {
    const items = [makeItem(1), makeItem(2)];
    const batch = makeBatch(items);
    await repo.insert(batch);

    await repo.replaceItemRecipe(batch.id, items[0]!.id, "r-new");
    const after = await repo.findById(batch.id);
    expect(after?.items.find((i) => i.id === items[0]!.id)?.recipeId).toBe("r-new");
  });

  it("reorderItems renumbers suggestedOrder according to input order", async () => {
    const items = [makeItem(1), makeItem(2), makeItem(3)];
    const batch = makeBatch(items);
    await repo.insert(batch);

    const newOrder = [items[2]!.id, items[0]!.id, items[1]!.id];
    await repo.reorderItems(batch.id, newOrder);
    const after = await repo.findById(batch.id);
    expect(after).not.toBeNull();
    const ordered = [...after!.items].sort(
      (a, b) => a.suggestedOrder - b.suggestedOrder,
    );
    expect(ordered.map((i) => i.id)).toEqual(newOrder);
    expect(ordered.map((i) => i.suggestedOrder)).toEqual([1, 2, 3]);
  });

  it("reorderItems rejects mismatched id sets", async () => {
    const items = [makeItem(1), makeItem(2)];
    const batch = makeBatch(items);
    await repo.insert(batch);

    await expect(repo.reorderItems(batch.id, [items[0]!.id])).rejects.toThrowError(
      /expected 2/,
    );
    await expect(
      repo.reorderItems(batch.id, [items[0]!.id, items[0]!.id]),
    ).rejects.toThrowError(/duplicated/);
  });
});
