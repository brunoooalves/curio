import { describe, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import {
  estimateCostForLines,
  getStats,
  listAllStats,
} from "@/lib/domain/receipt/priceService";
import type { Receipt, ReceiptItem } from "@/lib/domain/receipt/types";
import type { ReceiptRepository } from "@/lib/persistence/repositories/receiptRepository";
import type { ShoppingLine } from "@/lib/domain/shopping/aggregate";

function item(canonical: string, unit: number | null, total = 599): ReceiptItem {
  return {
    id: randomUUID(),
    rawName: canonical.toLowerCase(),
    canonicalName: canonical,
    rawQuantity: null,
    unitPrice: unit,
    totalPrice: total,
  };
}

function receipt(date: string, items: ReceiptItem[]): Receipt {
  return {
    id: randomUUID(),
    purchaseDate: date,
    store: "X",
    total: items.reduce((a, b) => a + b.totalPrice, 0),
    items,
    rawExtraction: null,
    modelUsed: "openai/gpt-4.1",
    createdAt: "n",
    updatedAt: "n",
  };
}

function fakeRepo(receipts: Receipt[]): ReceiptRepository {
  return {
    insert: vi.fn(),
    findById: vi.fn(),
    list: vi.fn(async () => [...receipts]),
    listItemsByCanonicalName: vi.fn(async (canonical) => {
      const out: { item: ReceiptItem; receipt: Pick<Receipt, "id" | "purchaseDate" | "store"> }[] = [];
      const sortedDesc = [...receipts].sort((a, b) =>
        a.purchaseDate < b.purchaseDate ? 1 : -1,
      );
      for (const r of sortedDesc) {
        for (const it of r.items) {
          if (it.canonicalName === canonical) {
            out.push({
              item: it,
              receipt: { id: r.id, purchaseDate: r.purchaseDate, store: r.store },
            });
          }
        }
      }
      return out;
    }),
  };
}

const sumLine = (canonical: string, value = 200): ShoppingLine => ({
  canonicalName: canonical,
  aggregatedQuantity: { kind: "sum", value, unit: "g" },
  sourceRecipeIds: [],
});

const mixedLine = (canonical: string): ShoppingLine => ({
  canonicalName: canonical,
  aggregatedQuantity: { kind: "mixed", parts: ["a", "b"] },
  sourceRecipeIds: [],
});

const freeLine = (canonical: string): ShoppingLine => ({
  canonicalName: canonical,
  aggregatedQuantity: { kind: "free", note: "a gosto" },
  sourceRecipeIds: [],
});

describe("getStats", () => {
  it("returns null when there are no observations", async () => {
    const stat = await getStats({ receiptRepository: fakeRepo([]) }, "Tomate");
    expect(stat).toBeNull();
  });

  it("aggregates stats from receipt observations", async () => {
    const repo = fakeRepo([
      receipt("2026-01-01", [item("Tomate", 500)]),
      receipt("2026-02-01", [item("Tomate", 700)]),
    ]);
    const stat = await getStats({ receiptRepository: repo }, "Tomate");
    expect(stat?.observationCount).toBe(2);
    expect(stat?.lastObservation.unitPrice).toBe(700);
    expect(stat?.avgUnitPrice).toBe(600);
  });
});

describe("listAllStats", () => {
  it("returns one stat per canonicalName seen across receipts, sorted by recency", async () => {
    const repo = fakeRepo([
      receipt("2026-01-01", [item("Tomate", 500), item("Cebola", 300)]),
      receipt("2026-02-01", [item("Tomate", 700)]),
    ]);
    const stats = await listAllStats({ receiptRepository: repo });
    expect(stats.map((s) => s.canonicalName)).toEqual(["Tomate", "Cebola"]);
  });
});

describe("estimateCostForLines", () => {
  it("uses lastObservation.unitPrice when available (basis=last)", async () => {
    const repo = fakeRepo([
      receipt("2026-01-01", [item("Tomate", 500)]),
      receipt("2026-02-01", [item("Tomate", 700)]),
    ]);
    const summary = await estimateCostForLines(
      { receiptRepository: repo },
      [sumLine("Tomate")],
    );
    expect(summary.perLine[0]?.basis).toBe("last");
    expect(summary.perLine[0]?.estimated).toBe(700);
    expect(summary.total).toBe(700);
  });

  it("falls back to avgUnitPrice (basis=avg) when last has no unitPrice", async () => {
    const repo = fakeRepo([
      receipt("2026-01-01", [item("Tomate", 500)]),
      receipt("2026-02-01", [item("Tomate", null, 800)]),
    ]);
    const summary = await estimateCostForLines(
      { receiptRepository: repo },
      [sumLine("Tomate")],
    );
    expect(summary.perLine[0]?.basis).toBe("avg");
    expect(summary.perLine[0]?.estimated).toBe(500);
  });

  it("returns null/unknown for ingredients with no history", async () => {
    const summary = await estimateCostForLines(
      { receiptRepository: fakeRepo([]) },
      [sumLine("Manjericao")],
    );
    expect(summary.perLine[0]).toEqual({
      canonicalName: "Manjericao",
      estimated: null,
      basis: "unknown",
    });
    expect(summary.total).toBe(0);
  });

  it("never estimates mixed or free lines", async () => {
    const repo = fakeRepo([receipt("2026-01-01", [item("Tomate", 500)])]);
    const summary = await estimateCostForLines(
      { receiptRepository: repo },
      [mixedLine("Tomate"), freeLine("Tomate")],
    );
    expect(summary.perLine.every((l) => l.basis === "unknown")).toBe(true);
    expect(summary.total).toBe(0);
  });

  it("totals only the known parts", async () => {
    const repo = fakeRepo([
      receipt("2026-01-01", [item("Tomate", 500), item("Cebola", 300)]),
    ]);
    const summary = await estimateCostForLines(
      { receiptRepository: repo },
      [sumLine("Tomate"), sumLine("Cebola"), sumLine("Manjericao")],
    );
    expect(summary.total).toBe(800);
    const unknown = summary.perLine.find((l) => l.canonicalName === "Manjericao");
    expect(unknown?.estimated).toBeNull();
  });
});
