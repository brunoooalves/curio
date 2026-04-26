import { getDb } from "@/lib/persistence/mongo/client";
import { createMongoRecipeRepository } from "@/lib/persistence/mongo/mongoRecipeRepository";
import { createMongoUserStateRepository } from "@/lib/persistence/mongo/mongoUserStateRepository";
import type { RecipeRepository } from "@/lib/persistence/repositories/recipeRepository";
import type { UserStateRepository } from "@/lib/persistence/repositories/userStateRepository";
import { getGastronomiaCurriculum } from "@/lib/domain/curriculum/loadGastronomia";

let recipeRepoPromise: Promise<RecipeRepository> | null = null;
let userStateRepoPromise: Promise<UserStateRepository> | null = null;

export function getRecipeRepository(): Promise<RecipeRepository> {
  if (!recipeRepoPromise) {
    recipeRepoPromise = (async () => createMongoRecipeRepository(await getDb()))();
  }
  return recipeRepoPromise;
}

export function getUserStateRepository(): Promise<UserStateRepository> {
  if (!userStateRepoPromise) {
    userStateRepoPromise = (async () => {
      const curriculum = getGastronomiaCurriculum();
      const firstModule = curriculum.modules[0];
      if (!firstModule) {
        throw new Error("Curriculum has no modules; cannot initialize user state.");
      }
      return createMongoUserStateRepository(await getDb(), {
        defaultModuleId: firstModule.id,
      });
    })();
  }
  return userStateRepoPromise;
}
