import type { Module } from "@/lib/domain/curriculum/types";
import type { Recipe, RecipeStatus } from "@/lib/domain/recipe/types";
import type { RecipeRepository } from "@/lib/persistence/repositories/recipeRepository";
import type { RecipeGenerator } from "@/lib/llm/generateRecipes";

export const DEFAULT_MIN_RECIPES_PER_MODULE = 6;
export const DEFAULT_EXCLUDED_STATUSES: RecipeStatus[] = ["rejeitada"];

export interface GetRecipesForModuleOptions {
  minCount?: number;
  excludeStatuses?: RecipeStatus[];
}

export async function getRecipesForModule(
  repository: RecipeRepository,
  generator: RecipeGenerator,
  module: Module,
  options: GetRecipesForModuleOptions = {},
): Promise<Recipe[]> {
  const minCount = options.minCount ?? DEFAULT_MIN_RECIPES_PER_MODULE;
  const excludeStatuses = options.excludeStatuses ?? DEFAULT_EXCLUDED_STATUSES;

  const existing = await repository.findByModuleId(module.id, { excludeStatuses });
  if (existing.length >= minCount) return existing;

  const missing = minCount - existing.length;
  const generated = await generator.generateRecipesForModule(module, missing);
  if (generated.length > 0) {
    await repository.insertMany(generated);
  }
  return [...existing, ...generated];
}

export async function generateAdditionalRecipes(
  repository: RecipeRepository,
  generator: RecipeGenerator,
  module: Module,
  count: number,
): Promise<Recipe[]> {
  if (count <= 0) return [];
  const generated = await generator.generateRecipesForModule(module, count);
  if (generated.length > 0) {
    await repository.insertMany(generated);
  }
  return generated;
}
