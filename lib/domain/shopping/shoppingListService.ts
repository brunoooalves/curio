import { randomUUID } from "node:crypto";
import type { Recipe } from "@/lib/domain/recipe/types";
import type { BatchRepository } from "@/lib/persistence/repositories/batchRepository";
import type { RecipeRepository } from "@/lib/persistence/repositories/recipeRepository";
import type { ShoppingListRepository } from "@/lib/persistence/repositories/shoppingListRepository";
import {
  computeShoppingLines,
  type NormalizeFn,
} from "./computeShoppingLines";
import type { ShoppingItem, ShoppingItemStatus, ShoppingList } from "./types";

export interface ShoppingListServiceDeps {
  shoppingListRepository: ShoppingListRepository;
  batchRepository: BatchRepository;
  recipeRepository: RecipeRepository;
  normalize: NormalizeFn;
}

export class ShoppingListNotFoundError extends Error {
  constructor(batchId: string) {
    super(`Lista de compras não encontrada para o plano "${batchId}".`);
    this.name = "ShoppingListNotFoundError";
  }
}

async function loadPendingRecipes(
  deps: Pick<ShoppingListServiceDeps, "batchRepository" | "recipeRepository">,
  batchId: string,
): Promise<Recipe[] | null> {
  const batch = await deps.batchRepository.findById(batchId);
  if (!batch) return null;
  const ids = batch.items.filter((i) => i.status === "pending").map((i) => i.recipeId);
  const recipes: Recipe[] = [];
  for (const id of ids) {
    const r = await deps.recipeRepository.findById(id);
    if (r) recipes.push(r);
  }
  return recipes;
}

export async function getShoppingList(
  deps: Pick<ShoppingListServiceDeps, "shoppingListRepository">,
  batchId: string,
): Promise<ShoppingList | null> {
  return deps.shoppingListRepository.findByBatchId(batchId);
}

export async function buildOrUpdateForBatch(
  deps: ShoppingListServiceDeps,
  batchId: string,
): Promise<ShoppingList> {
  const recipes = await loadPendingRecipes(deps, batchId);
  if (recipes === null) {
    throw new Error(`Plano "${batchId}" não encontrado.`);
  }

  const lines = await computeShoppingLines(recipes, deps.normalize);
  const existing = await deps.shoppingListRepository.findByBatchId(batchId);
  const now = new Date().toISOString();

  const previousByCanonical = new Map<string, ShoppingItem>();
  if (existing) {
    for (const item of existing.items) {
      previousByCanonical.set(item.canonicalName, item);
    }
  }

  const items: ShoppingItem[] = lines.map((line) => {
    const prev = previousByCanonical.get(line.canonicalName);
    const status: ShoppingItemStatus = prev && prev.status !== "pending" ? prev.status : "pending";
    return {
      id: prev?.id ?? randomUUID(),
      canonicalName: line.canonicalName,
      aggregatedQuantity: line.aggregatedQuantity,
      sourceRecipeIds: line.sourceRecipeIds,
      status,
      updatedAt: prev ? prev.updatedAt : now,
    };
  });

  const next: ShoppingList = existing
    ? { ...existing, items, updatedAt: now }
    : {
        id: randomUUID(),
        batchId,
        items,
        createdAt: now,
        updatedAt: now,
      };

  await deps.shoppingListRepository.upsert(next);
  return next;
}

export async function recompute(
  deps: ShoppingListServiceDeps,
  batchId: string,
): Promise<ShoppingList> {
  return buildOrUpdateForBatch(deps, batchId);
}

export async function markItem(
  deps: Pick<ShoppingListServiceDeps, "shoppingListRepository">,
  batchId: string,
  itemId: string,
  status: ShoppingItemStatus,
): Promise<void> {
  const list = await deps.shoppingListRepository.findByBatchId(batchId);
  if (!list) throw new ShoppingListNotFoundError(batchId);
  const updatedAt = new Date().toISOString();
  await deps.shoppingListRepository.updateItemStatus(list.id, itemId, status, updatedAt);
}
