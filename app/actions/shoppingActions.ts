"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  buildOrUpdateForBatch,
  markItem as markListItem,
} from "@/lib/domain/shopping/shoppingListService";
import {
  applyAsBatch,
  previewReplacement,
  previewShoppingList,
} from "@/lib/domain/shopping/sandboxService";
import { listReplacementCandidates } from "@/lib/domain/batch/batchService";
import {
  getBatchRepository,
  getIngredientNormalizer,
  getRecipeRepository,
  getShoppingListRepository,
  getUserStateRepository,
} from "@/lib/persistence/mongo/factories";
import { buildBatchDeps } from "@/lib/persistence/mongo/batchDeps";
import { getCurrentState } from "@/lib/domain/user/userService";
import { buildGenerationContext } from "@/lib/domain/generation/buildGenerationContext";
import type { ShoppingItemStatus, ShoppingList } from "@/lib/domain/shopping/types";
import type { ShoppingLine } from "@/lib/domain/shopping/aggregate";
import type { Recipe } from "@/lib/domain/recipe/types";
import type { PreviewReplacementResult } from "@/lib/domain/shopping/sandboxService";

async function buildShoppingDeps() {
  const [shoppingRepo, batchRepo, recipeRepo, normalize] = await Promise.all([
    getShoppingListRepository(),
    getBatchRepository(),
    getRecipeRepository(),
    getIngredientNormalizer(),
  ]);
  return {
    shoppingListRepository: shoppingRepo,
    batchRepository: batchRepo,
    recipeRepository: recipeRepo,
    normalize,
  };
}

export async function recomputeShoppingList(batchId: string): Promise<void> {
  const deps = await buildShoppingDeps();
  await buildOrUpdateForBatch(deps, batchId);
  revalidatePath("/lista");
}

export async function markShoppingItem(
  batchId: string,
  itemId: string,
  status: ShoppingItemStatus,
): Promise<void> {
  const deps = await buildShoppingDeps();
  await markListItem(deps, batchId, itemId, status);
  revalidatePath("/lista");
}

export async function previewShoppingListAction(
  recipeIds: string[],
): Promise<ShoppingLine[]> {
  const recipeRepo = await getRecipeRepository();
  const normalize = await getIngredientNormalizer();
  return previewShoppingList({ recipeRepository: recipeRepo, normalize }, recipeIds);
}

export async function applyAsBatchAction(recipeIds: string[]): Promise<void> {
  const deps = await buildBatchDeps();
  const userRepo = await getUserStateRepository();
  const state = await getCurrentState(userRepo);
  const generationContext = buildGenerationContext(state.profile);
  await applyAsBatch(
    { ...deps, recipeRepository: deps.recipeRepository },
    recipeIds,
    generationContext,
  );
  revalidatePath("/lote");
  revalidatePath("/lotes");
  revalidatePath("/");
  revalidatePath("/lista");
  redirect("/lote");
}

export async function loadReplacementCandidates(
  batchId: string,
  itemId: string,
): Promise<Recipe[]> {
  const batchDeps = await buildBatchDeps();
  return listReplacementCandidates(
    {
      batchRepository: batchDeps.batchRepository,
      recipeRepository: batchDeps.recipeRepository,
      currentModuleId: batchDeps.currentModuleId,
    },
    batchId,
    itemId,
  );
}

export async function previewReplacementAction(
  batchId: string,
  itemId: string,
  candidateRecipeId: string,
): Promise<PreviewReplacementResult> {
  const deps = await buildShoppingDeps();
  return previewReplacement(deps, batchId, itemId, candidateRecipeId);
}

export async function getActiveShoppingList(
  batchId: string,
): Promise<ShoppingList | null> {
  const repo = await getShoppingListRepository();
  return repo.findByBatchId(batchId);
}
