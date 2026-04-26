import type { Recipe } from "@/lib/domain/recipe/types";
import { parseQuantity } from "@/lib/domain/ingredient/parseQuantity";
import {
  aggregateIngredients,
  type AggregateInput,
  type ShoppingLine,
} from "./aggregate";

export type NormalizeFn = (
  rawNames: string[],
) => Promise<Map<string, { canonical: string; defaultUnit: string | null }>>;

export async function computeShoppingLines(
  recipes: Recipe[],
  normalize: NormalizeFn,
): Promise<ShoppingLine[]> {
  if (recipes.length === 0) return [];

  const rawNames: string[] = [];
  for (const recipe of recipes) {
    for (const ing of recipe.ingredients) rawNames.push(ing.name);
  }

  const normalized = await normalize(rawNames);

  const inputs: AggregateInput[] = [];
  for (const recipe of recipes) {
    for (const ing of recipe.ingredients) {
      const trimmed = ing.name.trim();
      const norm = normalized.get(trimmed);
      const canonical = norm?.canonical ?? trimmed;
      const defaultUnit = norm?.defaultUnit ?? null;
      inputs.push({
        canonicalName: canonical,
        parsed: parseQuantity(ing.quantity, defaultUnit),
        rawText: ing.quantity,
        recipeId: recipe.id,
      });
    }
  }

  return aggregateIngredients(inputs);
}
