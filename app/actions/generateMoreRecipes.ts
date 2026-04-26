"use server";

import { revalidatePath } from "next/cache";
import { findModuleById, getGastronomiaCurriculum } from "@/lib/domain/curriculum/loadGastronomia";
import { generateAdditionalRecipes } from "@/lib/domain/recipe/recipeService";
import { recipeGenerator } from "@/lib/llm/generateRecipes";
import {
  getDietaryContextRepository,
  getRecipeRepository,
  getUserStateRepository,
} from "@/lib/persistence/mongo/factories";
import { getCurrentState } from "@/lib/domain/user/userService";
import {
  createContext,
  getContext,
} from "@/lib/domain/context/contextService";
import { buildGenerationContext } from "@/lib/domain/generation/buildGenerationContext";

const DEFAULT_BATCH = 4;

export interface GenerateMoreRecipesInput {
  moduleId: string;
  count?: number;
  contextId?: string | null;
  adHoc?: {
    restrictions?: string[];
    dislikes?: string[];
    preferences?: string[];
  };
  servings?: number | null;
  saveAs?: { name: string } | null;
}

export async function generateMoreRecipes(input: GenerateMoreRecipesInput): Promise<void> {
  const curriculum = getGastronomiaCurriculum();
  const mod = findModuleById(curriculum, input.moduleId);
  if (!mod) {
    throw new Error(`Unknown module id: ${input.moduleId}`);
  }

  const recipeRepo = await getRecipeRepository();
  const userRepo = await getUserStateRepository();
  const ctxRepo = await getDietaryContextRepository();
  const state = await getCurrentState(userRepo);

  let savedContext = null;
  if (input.contextId) {
    savedContext = await getContext(ctxRepo, input.contextId);
  }

  if (input.saveAs?.name && input.saveAs.name.trim() !== "") {
    const created = await createContext(ctxRepo, {
      name: input.saveAs.name,
      restrictions: input.adHoc?.restrictions ?? [],
      dislikes: input.adHoc?.dislikes ?? [],
      preferences: input.adHoc?.preferences ?? [],
      servingsOverride: input.servings ?? null,
    });
    savedContext = created;
  }

  const ctx = buildGenerationContext(state.profile, {
    context: savedContext,
    adHoc: input.adHoc,
    servings: input.servings ?? null,
  });

  const count = input.count ?? DEFAULT_BATCH;
  await generateAdditionalRecipes(recipeRepo, recipeGenerator, mod, count, ctx);
  revalidatePath("/");
}
