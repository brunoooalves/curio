import { getDb } from "@/lib/persistence/mongo/client";
import { createMongoRecipeRepository } from "@/lib/persistence/mongo/mongoRecipeRepository";
import { createMongoUserStateRepository } from "@/lib/persistence/mongo/mongoUserStateRepository";
import { createMongoPracticeEventRepository } from "@/lib/persistence/mongo/mongoPracticeEventRepository";
import { createMongoDietaryContextRepository } from "@/lib/persistence/mongo/mongoDietaryContextRepository";
import { createMongoBatchRepository } from "@/lib/persistence/mongo/mongoBatchRepository";
import { createMongoIngredientRepository } from "@/lib/persistence/mongo/mongoIngredientRepository";
import { createNormalizer, type NormalizeIngredientsFn } from "@/lib/llm/normalizeIngredient";
import type { RecipeRepository } from "@/lib/persistence/repositories/recipeRepository";
import type { UserStateRepository } from "@/lib/persistence/repositories/userStateRepository";
import type { PracticeEventRepository } from "@/lib/persistence/repositories/practiceEventRepository";
import type { DietaryContextRepository } from "@/lib/persistence/repositories/dietaryContextRepository";
import type { BatchRepository } from "@/lib/persistence/repositories/batchRepository";
import type { IngredientRepository } from "@/lib/persistence/repositories/ingredientRepository";
import { getGastronomiaCurriculum } from "@/lib/domain/curriculum/loadGastronomia";

let recipeRepoPromise: Promise<RecipeRepository> | null = null;
let userStateRepoPromise: Promise<UserStateRepository> | null = null;
let practiceEventRepoPromise: Promise<PracticeEventRepository> | null = null;
let dietaryContextRepoPromise: Promise<DietaryContextRepository> | null = null;
let batchRepoPromise: Promise<BatchRepository> | null = null;
let ingredientRepoPromise: Promise<IngredientRepository> | null = null;

export function getRecipeRepository(): Promise<RecipeRepository> {
  if (!recipeRepoPromise) {
    recipeRepoPromise = (async () => createMongoRecipeRepository(await getDb()))();
  }
  return recipeRepoPromise;
}

export function getIngredientRepository(): Promise<IngredientRepository> {
  if (!ingredientRepoPromise) {
    ingredientRepoPromise = (async () => createMongoIngredientRepository(await getDb()))();
  }
  return ingredientRepoPromise;
}

export async function getIngredientNormalizer(): Promise<NormalizeIngredientsFn> {
  return createNormalizer(await getIngredientRepository());
}

export function getBatchRepository(): Promise<BatchRepository> {
  if (!batchRepoPromise) {
    batchRepoPromise = (async () => createMongoBatchRepository(await getDb()))();
  }
  return batchRepoPromise;
}

export function getDietaryContextRepository(): Promise<DietaryContextRepository> {
  if (!dietaryContextRepoPromise) {
    dietaryContextRepoPromise = (async () =>
      createMongoDietaryContextRepository(await getDb()))();
  }
  return dietaryContextRepoPromise;
}

export function getPracticeEventRepository(): Promise<PracticeEventRepository> {
  if (!practiceEventRepoPromise) {
    practiceEventRepoPromise = (async () =>
      createMongoPracticeEventRepository(await getDb()))();
  }
  return practiceEventRepoPromise;
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
