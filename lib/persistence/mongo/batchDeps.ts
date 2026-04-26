import { getCurrentState } from "@/lib/domain/user/userService";
import { getGastronomiaCurriculum } from "@/lib/domain/curriculum/loadGastronomia";
import { recipeGenerator } from "@/lib/llm/generateRecipes";
import {
  getBatchRepository,
  getPracticeEventRepository,
  getRecipeRepository,
  getUserStateRepository,
} from "@/lib/persistence/mongo/factories";
import type { BatchServiceDeps } from "@/lib/domain/batch/batchService";

export async function buildBatchDeps(): Promise<BatchServiceDeps> {
  const [batchRepo, recipeRepo, eventRepo, userRepo] = await Promise.all([
    getBatchRepository(),
    getRecipeRepository(),
    getPracticeEventRepository(),
    getUserStateRepository(),
  ]);
  const state = await getCurrentState(userRepo);
  return {
    batchRepository: batchRepo,
    recipeRepository: recipeRepo,
    recipeGenerator,
    practiceEventRepository: eventRepo,
    curriculum: getGastronomiaCurriculum(),
    currentModuleId: state.currentModuleId,
    completedModuleIds: state.completedModuleIds,
  };
}
