import type { Recipe, RecipeStatus } from "@/lib/domain/recipe/types";

export interface FindRecipesByModuleOptions {
  excludeStatuses?: RecipeStatus[];
}

export interface RecipeRepository {
  findByModuleId(
    moduleId: string,
    options?: FindRecipesByModuleOptions,
  ): Promise<Recipe[]>;
  findByStatus(
    status: RecipeStatus,
    options?: { moduleId?: string },
  ): Promise<Recipe[]>;
  findById(id: string): Promise<Recipe | null>;
  insertMany(recipes: Recipe[]): Promise<void>;
  updateStatus(id: string, status: RecipeStatus): Promise<void>;
}
