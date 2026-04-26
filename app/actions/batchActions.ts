"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createBatch,
  markItemDone,
  reorderItems,
  replaceItemRecipe,
  skipItem,
} from "@/lib/domain/batch/batchService";
import { buildBatchDeps } from "@/lib/persistence/mongo/batchDeps";
import {
  getDietaryContextRepository,
  getUserStateRepository,
} from "@/lib/persistence/mongo/factories";
import { getCurrentState } from "@/lib/domain/user/userService";
import { getContext, createContext } from "@/lib/domain/context/contextService";
import { buildGenerationContext } from "@/lib/domain/generation/buildGenerationContext";
import type { MealsByType } from "@/lib/domain/batch/types";

function revalidateAll(batchId?: string): void {
  revalidatePath("/");
  revalidatePath("/lote");
  revalidatePath("/lotes");
  if (batchId) revalidatePath(`/lote/${batchId}`);
}

export interface CreateBatchActionInput {
  mealsByType: Partial<MealsByType>;
  contextId?: string | null;
  adHoc?: {
    restrictions?: string[];
    dislikes?: string[];
    preferences?: string[];
  };
  servings?: number | null;
  saveAs?: { name: string } | null;
}

export async function createBatchAction(
  input: CreateBatchActionInput,
): Promise<void> {
  const deps = await buildBatchDeps();
  const userRepo = await getUserStateRepository();
  const ctxRepo = await getDietaryContextRepository();
  const state = await getCurrentState(userRepo);

  let savedContext = null;
  if (input.contextId) {
    savedContext = await getContext(ctxRepo, input.contextId);
  }
  if (input.saveAs?.name && input.saveAs.name.trim() !== "") {
    savedContext = await createContext(ctxRepo, {
      name: input.saveAs.name,
      restrictions: input.adHoc?.restrictions ?? [],
      dislikes: input.adHoc?.dislikes ?? [],
      preferences: input.adHoc?.preferences ?? [],
      servingsOverride: input.servings ?? null,
    });
  }

  const generationContext = buildGenerationContext(state.profile, {
    context: savedContext,
    adHoc: input.adHoc,
    servings: input.servings ?? null,
  });

  await createBatch(deps, {
    mealsByType: input.mealsByType,
    generationContext,
  });
  revalidateAll();
  redirect("/lote");
}

export async function markBatchItemDone(
  batchId: string,
  itemId: string,
  reflection: string | null,
): Promise<void> {
  const deps = await buildBatchDeps();
  await markItemDone(deps, batchId, itemId, reflection);
  revalidateAll(batchId);
}

export async function skipBatchItem(batchId: string, itemId: string): Promise<void> {
  const deps = await buildBatchDeps();
  await skipItem(deps, batchId, itemId);
  revalidateAll(batchId);
}

export async function replaceBatchItemRecipe(
  batchId: string,
  itemId: string,
): Promise<void> {
  const deps = await buildBatchDeps();
  await replaceItemRecipe(deps, batchId, itemId);
  revalidateAll(batchId);
}

export async function reorderBatchItems(
  batchId: string,
  orderedItemIds: string[],
): Promise<void> {
  const deps = await buildBatchDeps();
  await reorderItems(deps, batchId, orderedItemIds);
  revalidateAll(batchId);
}
