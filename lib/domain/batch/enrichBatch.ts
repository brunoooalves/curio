import type { Batch } from "./types";
import type { Recipe } from "@/lib/domain/recipe/types";
import type { RecipeRepository } from "@/lib/persistence/repositories/recipeRepository";

export interface EnrichedBatchItem {
  id: string;
  mealType: Batch["items"][number]["mealType"];
  recipeId: string;
  suggestedOrder: number;
  status: Batch["items"][number]["status"];
  doneAt: string | null;
  recipeTitle: string;
  recipeDifficulty: number | null;
  recipeEstimatedMinutes: number | null;
  recipeServings: number | null;
}

export async function enrichBatchItems(
  recipeRepo: RecipeRepository,
  batch: Batch,
): Promise<EnrichedBatchItem[]> {
  const ids = Array.from(new Set(batch.items.map((i) => i.recipeId)));
  const recipes = new Map<string, Recipe>();
  for (const id of ids) {
    const r = await recipeRepo.findById(id);
    if (r) recipes.set(id, r);
  }
  return batch.items.map((item) => {
    const recipe = recipes.get(item.recipeId) ?? null;
    return {
      ...item,
      recipeTitle: recipe?.title ?? "(receita removida)",
      recipeDifficulty: recipe?.difficulty ?? null,
      recipeEstimatedMinutes: recipe?.estimatedMinutes ?? null,
      recipeServings: recipe?.servings ?? null,
    };
  });
}
