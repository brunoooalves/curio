import type { Recipe, RecipeStatus } from "@/lib/domain/recipe/types";

export interface RecipeRepository {
  findByModuleId(moduleId: string): Promise<Recipe[]>;
  findById(id: string): Promise<Recipe | null>;
  insertMany(recipes: Recipe[]): Promise<void>;
  updateStatus(id: string, status: RecipeStatus): Promise<void>;
}
