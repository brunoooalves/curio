import type { AggregatedQuantity } from "./aggregate";

export type ShoppingItemStatus = "pending" | "bought" | "have_at_home" | "ignored";

export interface ShoppingItem {
  id: string;
  canonicalName: string;
  aggregatedQuantity: AggregatedQuantity;
  sourceRecipeIds: string[];
  status: ShoppingItemStatus;
  updatedAt: string;
}

export interface ShoppingList {
  id: string;
  batchId: string;
  items: ShoppingItem[];
  createdAt: string;
  updatedAt: string;
}
