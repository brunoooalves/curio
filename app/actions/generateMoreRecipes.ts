"use server";

import { revalidatePath } from "next/cache";
import { findModuleById, getGastronomiaCurriculum } from "@/lib/domain/curriculum/loadGastronomia";
import { generateAdditionalRecipes } from "@/lib/domain/recipe/recipeService";
import { recipeGenerator } from "@/lib/llm/generateRecipes";
import {
  getRecipeRepository,
  getUserStateRepository,
} from "@/lib/persistence/mongo/factories";
import { getCurrentState } from "@/lib/domain/user/userService";
import { buildGenerationContext } from "@/lib/domain/generation/buildGenerationContext";

const DEFAULT_BATCH = 4;

export async function generateMoreRecipes(
  moduleId: string,
  count: number = DEFAULT_BATCH,
): Promise<void> {
  const curriculum = getGastronomiaCurriculum();
  const mod = findModuleById(curriculum, moduleId);
  if (!mod) {
    throw new Error(`Unknown module id: ${moduleId}`);
  }

  const recipeRepo = await getRecipeRepository();
  const userRepo = await getUserStateRepository();
  const state = await getCurrentState(userRepo);
  const ctx = buildGenerationContext(state.profile);

  await generateAdditionalRecipes(recipeRepo, recipeGenerator, mod, count, ctx);
  revalidatePath("/");
}
