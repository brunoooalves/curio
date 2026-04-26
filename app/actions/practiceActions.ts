"use server";

import { revalidatePath } from "next/cache";
import {
  markCompleted,
  markRejected,
  revert,
} from "@/lib/domain/practice/practiceService";
import {
  getPracticeEventRepository,
  getRecipeRepository,
} from "@/lib/persistence/mongo/factories";

function revalidateAll(recipeId: string): void {
  revalidatePath("/");
  revalidatePath(`/receita/${recipeId}`);
  revalidatePath("/historico");
  revalidatePath("/receitas/rejeitadas");
}

export async function completeRecipe(
  recipeId: string,
  reflection: string | null,
): Promise<void> {
  const recipeRepo = await getRecipeRepository();
  const eventRepo = await getPracticeEventRepository();
  const trimmed = reflection?.trim() ?? "";
  await markCompleted(recipeRepo, eventRepo, recipeId, trimmed.length > 0 ? trimmed : null);
  revalidateAll(recipeId);
}

export async function rejectRecipe(recipeId: string): Promise<void> {
  const recipeRepo = await getRecipeRepository();
  const eventRepo = await getPracticeEventRepository();
  await markRejected(recipeRepo, eventRepo, recipeId);
  revalidateAll(recipeId);
}

export async function revertRecipe(recipeId: string): Promise<void> {
  const recipeRepo = await getRecipeRepository();
  const eventRepo = await getPracticeEventRepository();
  await revert(recipeRepo, eventRepo, recipeId);
  revalidateAll(recipeId);
}
