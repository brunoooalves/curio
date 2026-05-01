import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, type Db } from "mongodb";
import { randomUUID } from "node:crypto";
import { createMongoReceiptRepository } from "@/lib/persistence/mongo/mongoReceiptRepository";
import type { Receipt, ReceiptItem } from "@/lib/domain/receipt/types";
import type { ReceiptRepository } from "@/lib/persistence/repositories/receiptRepository";

let mongo: MongoMemoryServer;
let client: MongoClient;
let db: Db;
let repo: ReceiptRepository;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  client = new MongoClient(mongo.getUri());
  await client.connect();
  db = client.db("curio-test");
  repo = await createMongoReceiptRepository(db);
}, 60_000);

afterAll(async () => {
  await client.close();
  await mongo.stop();
});

beforeEach(async () => {
  await db.collection("receipts").deleteMany({});
});

function makeItem(overrides: Partial<ReceiptItem> = {}): ReceiptItem {
  return {
    id: randomUUID(),
    rawName: "tomate",
    canonicalName: "Tomate",
    rawQuantity: "500g",
    unitPrice: 599,
    totalPrice: 599,
    ...overrides,
  };
}

function makeReceipt(overrides: Partial<Receipt> = {}): Receipt {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    purchaseDate: "2026-04-26",
    store: "Mercado Local",
    total: 599,
    items: [makeItem()],
    rawExtraction: { from: "test" },
    modelUsed: "openai/gpt-4.1",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("mongoReceiptRepository", () => {
  it("inserts and findById returns the receipt", async () => {
    const r = makeReceipt();
    await repo.insert(r);
    const fetched = await repo.findById(r.id);
    expect(fetched?.id).toBe(r.id);
    expect(fetched?.modelUsed).toBe("openai/gpt-4.1");
  });

  it("list returns receipts ordered by purchaseDate desc and respects limit/from/to", async () => {
    await repo.insert(makeReceipt({ purchaseDate: "2026-01-01" }));
    await repo.insert(makeReceipt({ purchaseDate: "2026-03-15" }));
    await repo.insert(makeReceipt({ purchaseDate: "2026-02-10" }));

    const all = await repo.list();
    expect(all.map((r) => r.purchaseDate)).toEqual([
      "2026-03-15",
      "2026-02-10",
      "2026-01-01",
    ]);

    const limited = await repo.list({ limit: 2 });
    expect(limited).toHaveLength(2);

    const filtered = await repo.list({ from: "2026-02-01", to: "2026-03-01" });
    expect(filtered.map((r) => r.purchaseDate)).toEqual(["2026-02-10"]);
  });

  it("listItemsByCanonicalName returns matching items with receipt snapshots", async () => {
    await repo.insert(
      makeReceipt({
        purchaseDate: "2026-04-01",
        items: [
          makeItem({ canonicalName: "Tomate", unitPrice: 500, totalPrice: 500 }),
          makeItem({ canonicalName: "Cebola", unitPrice: 300, totalPrice: 300 }),
        ],
      }),
    );
    await repo.insert(
      makeReceipt({
        purchaseDate: "2026-04-15",
        store: "Outro Mercado",
        items: [makeItem({ canonicalName: "Tomate", unitPrice: 700, totalPrice: 700 })],
      }),
    );

    const observations = await repo.listItemsByCanonicalName("Tomate");
    expect(observations).toHaveLength(2);
    expect(observations[0]?.receipt.purchaseDate).toBe("2026-04-15");
    expect(observations[0]?.item.unitPrice).toBe(700);
    expect(observations[0]?.receipt.store).toBe("Outro Mercado");
    expect(observations[1]?.item.unitPrice).toBe(500);

    const limited = await repo.listItemsByCanonicalName("Tomate", { limit: 1 });
    expect(limited).toHaveLength(1);

    expect(await repo.listItemsByCanonicalName("Inexistente")).toEqual([]);
  });

  it("does not leak _id to domain types", async () => {
    const r = makeReceipt();
    await repo.insert(r);
    const fetched = await repo.findById(r.id);
    expect(fetched).not.toBeNull();
    expect(Object.prototype.hasOwnProperty.call(fetched, "_id")).toBe(false);
  });
});
