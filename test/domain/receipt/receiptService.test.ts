import { describe, it, expect, vi } from "vitest";
import { ingestImage } from "@/lib/domain/receipt/receiptService";
import type { Receipt } from "@/lib/domain/receipt/types";
import type { ReceiptRepository } from "@/lib/persistence/repositories/receiptRepository";
import type { ExtractReceiptFromImageFn } from "@/lib/llm/extractReceipt";
import type { NormalizeIngredientsFn } from "@/lib/llm/normalizeIngredient";

function fakeRepo(): ReceiptRepository & { _store: Receipt[] } {
  const store: Receipt[] = [];
  return {
    _store: store,
    insert: vi.fn(async (r: Receipt) => {
      store.push(r);
    }),
    findById: vi.fn(async (id: string) => store.find((r) => r.id === id) ?? null),
    list: vi.fn(async () => [...store]),
    listItemsByCanonicalName: vi.fn(async () => []),
  };
}

function fakeExtract(
  result: Awaited<ReturnType<ExtractReceiptFromImageFn>>["result"],
  modelUsed = "openai/gpt-4.1",
): ExtractReceiptFromImageFn {
  return vi.fn(async () => ({ result, modelUsed }));
}

function fakeNormalize(
  map: Record<string, { canonical: string; defaultUnit: string | null }>,
): NormalizeIngredientsFn {
  return vi.fn(async (rawNames) => {
    const out = new Map<string, { canonical: string; defaultUnit: string | null }>();
    for (const r of rawNames) {
      const v = map[r];
      if (v) out.set(r, v);
    }
    return out;
  });
}

describe("ingestImage", () => {
  it("persists a Receipt with canonical names assigned where the normalizer hits", async () => {
    const repo = fakeRepo();
    const extract = fakeExtract({
      purchaseDate: "2026-04-26",
      store: "Mercado Local",
      total: 1199,
      items: [
        { rawName: "tomate", rawQuantity: "500g", unitPrice: 599, totalPrice: 599 },
        { rawName: "carambola", rawQuantity: "1 un", unitPrice: 600, totalPrice: 600 },
      ],
    });
    const normalize = fakeNormalize({
      tomate: { canonical: "Tomate", defaultUnit: "g" },
    });

    const r = await ingestImage(
      {
        receiptRepository: repo,
        extractReceiptFromImage: extract,
        normalizeIngredients: normalize,
      },
      { base64: "x", mimeType: "image/jpeg" },
    );

    expect(repo.insert).toHaveBeenCalledTimes(1);
    expect(r.purchaseDate).toBe("2026-04-26");
    expect(r.store).toBe("Mercado Local");
    expect(r.total).toBe(1199);
    expect(r.modelUsed).toBe("openai/gpt-4.1");
    expect(r.items[0]?.canonicalName).toBe("Tomate");
    expect(r.items[1]?.canonicalName).toBeNull();
    expect(r.items.every((i) => Number.isInteger(i.totalPrice))).toBe(true);
    expect(r.rawExtraction).toBeDefined();
  });

  it("falls back to today's date and sum of items when extraction lacks them", async () => {
    const repo = fakeRepo();
    const extract = fakeExtract({
      purchaseDate: null,
      store: null,
      total: null,
      items: [
        { rawName: "x", rawQuantity: null, unitPrice: null, totalPrice: 250 },
        { rawName: "y", rawQuantity: null, unitPrice: null, totalPrice: 750 },
      ],
    });
    const r = await ingestImage(
      {
        receiptRepository: repo,
        extractReceiptFromImage: extract,
        normalizeIngredients: fakeNormalize({}),
      },
      { base64: "x", mimeType: "image/jpeg" },
    );

    expect(r.total).toBe(1000);
    expect(r.purchaseDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r.store).toBeNull();
  });

  it("does not call normalize when there are no items", async () => {
    const repo = fakeRepo();
    const normalize = fakeNormalize({});
    const extract = fakeExtract({
      purchaseDate: "2026-04-26",
      store: null,
      total: 0,
      items: [],
    });

    const r = await ingestImage(
      {
        receiptRepository: repo,
        extractReceiptFromImage: extract,
        normalizeIngredients: normalize,
      },
      { base64: "x", mimeType: "image/jpeg" },
    );

    expect(normalize).not.toHaveBeenCalled();
    expect(r.items).toEqual([]);
    expect(r.total).toBe(0);
  });

  it("propagates extraction errors", async () => {
    const repo = fakeRepo();
    const extract: ExtractReceiptFromImageFn = vi.fn(async () => {
      throw new Error("vision down");
    });
    await expect(
      ingestImage(
        {
          receiptRepository: repo,
          extractReceiptFromImage: extract,
          normalizeIngredients: fakeNormalize({}),
        },
        { base64: "x", mimeType: "image/jpeg" },
      ),
    ).rejects.toThrowError(/vision down/);
    expect(repo.insert).not.toHaveBeenCalled();
  });
});
