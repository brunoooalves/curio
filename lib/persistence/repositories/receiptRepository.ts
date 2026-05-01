import type { Receipt, ReceiptItem } from "@/lib/domain/receipt/types";

export interface ListReceiptsOptions {
  limit?: number;
  from?: string;
  to?: string;
}

export interface ItemWithReceipt {
  item: ReceiptItem;
  receipt: Pick<Receipt, "id" | "purchaseDate" | "store">;
}

export interface ReceiptRepository {
  insert(receipt: Receipt): Promise<void>;
  findById(id: string): Promise<Receipt | null>;
  list(options?: ListReceiptsOptions): Promise<Receipt[]>;
  listItemsByCanonicalName(
    canonicalName: string,
    options?: { limit?: number },
  ): Promise<ItemWithReceipt[]>;
}
