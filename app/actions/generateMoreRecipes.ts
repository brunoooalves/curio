"use server";

import { revalidatePath } from "next/cache";
import { findModuleById, getGastronomiaCurriculum } from "@/lib/domain/curriculum/loadGastronomia";
import { generateAdditionalRecipes } from "@/lib/domain/recipe/recipeService";
import { recipeGenerator } from "@/lib/llm/generateRecipes";
import { getRecipeRepository } from "@/lib/persistence/mongo/factories";

const DEFAULT_BATCH = 4;

export async function generateMoreRecipes(moduleId: string, count: number = DEFAULT_BATCH): Promise<void> {
  const curriculum = getGastronomiaCurriculum();
  const mod = findModuleById(curriculum, moduleId);
  if (!mod) {
    throw new Error(`Unknown module id: ${moduleId}`);
  }

  const repository = await getRecipeRepository();
  await generateAdditionalRecipes(repository, recipeGenerator, mod, count);
  revalidatePath("/");
}
