import type { Batch, BatchItemStatus } from "@/lib/domain/batch/types";

export interface BatchRepository {
  findActive(): Promise<Batch | null>;
  findById(id: string): Promise<Batch | null>;
  list(): Promise<Batch[]>;
  insert(batch: Batch): Promise<void>;
  updateItemStatus(
    batchId: string,
    itemId: string,
    status: BatchItemStatus,
    doneAt: string | null,
  ): Promise<void>;
  replaceItemRecipe(
    batchId: string,
    itemId: string,
    newRecipeId: string,
  ): Promise<void>;
  reorderItems(batchId: string, orderedItemIds: string[]): Promise<void>;
}
