import { randomUUID } from "node:crypto";
import type {
  ListReceiptsOptions,
  ReceiptRepository,
} from "@/lib/persistence/repositories/receiptRepository";
import type {
  ExtractInput,
  ExtractReceiptFromImageFn,
} from "@/lib/llm/extractReceipt";
import type { NormalizeIngredientsFn } from "@/lib/llm/normalizeIngredient";
import type { Receipt, ReceiptItem } from "./types";

export interface ReceiptServiceDeps {
  receiptRepository: ReceiptRepository;
  extractReceiptFromImage: ExtractReceiptFromImageFn;
  normalizeIngredients: NormalizeIngredientsFn;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function sumItems(items: { totalPrice: number }[]): number {
  return items.reduce((acc, i) => acc + i.totalPrice, 0);
}

export async function ingestImage(
  deps: ReceiptServiceDeps,
  input: ExtractInput,
): Promise<Receipt> {
  const { result, modelUsed } = await deps.extractReceiptFromImage(input);

  const rawNames = result.items.map((i) => i.rawName);
  const canonicalMap =
    rawNames.length > 0 ? await deps.normalizeIngredients(rawNames) : new Map();

  const items: ReceiptItem[] = result.items.map((extracted) => ({
    id: randomUUID(),
    rawName: extracted.rawName,
    canonicalName: canonicalMap.get(extracted.rawName.trim())?.canonical ?? null,
    rawQuantity: extracted.rawQuantity,
    unitPrice: extracted.unitPrice,
    totalPrice: extracted.totalPrice,
  }));

  const now = new Date().toISOString();
  const purchaseDate = result.purchaseDate ?? todayIso();
  const total = result.total ?? sumItems(items);

  const receipt: Receipt = {
    id: randomUUID(),
    purchaseDate,
    store: result.store,
    total,
    items,
    rawExtraction: result,
    modelUsed,
    createdAt: now,
    updatedAt: now,
  };

  await deps.receiptRepository.insert(receipt);
  return receipt;
}

export async function findReceiptById(
  deps: Pick<ReceiptServiceDeps, "receiptRepository">,
  id: string,
): Promise<Receipt | null> {
  return deps.receiptRepository.findById(id);
}

export async function listReceipts(
  deps: Pick<ReceiptServiceDeps, "receiptRepository">,
  options?: ListReceiptsOptions,
): Promise<Receipt[]> {
  return deps.receiptRepository.list(options);
}
