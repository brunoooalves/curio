import type { ShoppingItemStatus, ShoppingList } from "@/lib/domain/shopping/types";

export interface ShoppingListRepository {
  findByBatchId(batchId: string): Promise<ShoppingList | null>;
  upsert(list: ShoppingList): Promise<void>;
  updateItemStatus(
    listId: string,
    itemId: string,
    status: ShoppingItemStatus,
    updatedAt: string,
  ): Promise<void>;
}
