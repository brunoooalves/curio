import { getCurrentState } from "@/lib/domain/user/userService";
import { getGastronomiaCurriculum } from "@/lib/domain/curriculum/loadGastronomia";
import { recipeGenerator } from "@/lib/llm/generateRecipes";
import {
  getBatchRepository,
  getIngredientNormalizer,
  getPracticeEventRepository,
  getRecipeRepository,
  getShoppingListRepository,
  getUserStateRepository,
} from "@/lib/persistence/mongo/factories";
import type { BatchServiceDeps } from "@/lib/domain/batch/batchService";
import { recompute } from "@/lib/domain/shopping/shoppingListService";

export async function buildBatchDeps(): Promise<BatchServiceDeps> {
  const [batchRepo, recipeRepo, eventRepo, userRepo, shoppingRepo, normalize] =
    await Promise.all([
      getBatchRepository(),
      getRecipeRepository(),
      getPracticeEventRepository(),
      getUserStateRepository(),
      getShoppingListRepository(),
      getIngredientNormalizer(),
    ]);
  const state = await getCurrentState(userRepo);

  const shoppingDeps = {
    shoppingListRepository: shoppingRepo,
    batchRepository: batchRepo,
    recipeRepository: recipeRepo,
    normalize,
  };

  return {
    batchRepository: batchRepo,
    recipeRepository: recipeRepo,
    recipeGenerator,
    practiceEventRepository: eventRepo,
    curriculum: getGastronomiaCurriculum(),
    currentModuleId: state.currentModuleId,
    completedModuleIds: state.completedModuleIds,
    shoppingListHook: {
      recompute: (batchId) => recompute(shoppingDeps, batchId),
    },
  };
}
