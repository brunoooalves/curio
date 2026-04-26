import { getDb } from "@/lib/persistence/mongo/client";
import { createMongoRecipeRepository } from "@/lib/persistence/mongo/mongoRecipeRepository";
import type { RecipeRepository } from "@/lib/persistence/repositories/recipeRepository";

let recipeRepoPromise: Promise<RecipeRepository> | null = null;

export function getRecipeRepository(): Promise<RecipeRepository> {
  if (!recipeRepoPromise) {
    recipeRepoPromise = (async () => createMongoRecipeRepository(await getDb()))();
  }
  return recipeRepoPromise;
}
