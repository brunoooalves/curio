import type { Recipe } from "@/lib/domain/recipe/types";
import type { ItemRequest } from "./selectRecipes";

/**
 * Heuristica de ordenacao sugerida (estavel, sem aleatoriedade):
 * 1. Receitas com ingredientes mais pereciveis primeiro (match por keyword).
 * 2. Empate: dificuldade crescente (1 -> 5).
 * 3. Empate: estimatedMinutes crescente.
 * 4. Empate: ordem original preservada (estabilidade).
 *
 * Atribui suggestedOrder = 1..N na ordem resultante.
 */
export const PERISHABLE_KEYWORDS = [
  "peixe",
  "frutos do mar",
  "camarao",
  "camarão",
  "lula",
  "polvo",
  "marisco",
  "folhas",
  "manjericao",
  "manjericão",
  "coentro",
  "salsinha",
  "cebolinha",
  "rucula",
  "rúcula",
  "alface",
  "agriao",
  "agrião",
  "espinafre",
] as const;

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

const NORMALIZED_KEYWORDS = PERISHABLE_KEYWORDS.map(normalize);

export function hasPerishable(recipe: Recipe): boolean {
  for (const ing of recipe.ingredients) {
    const name = normalize(ing.name);
    for (const kw of NORMALIZED_KEYWORDS) {
      if (name.includes(kw)) return true;
    }
  }
  return false;
}

export interface OrderInput {
  request: ItemRequest;
  recipe: Recipe;
}

export interface OrderedItem extends OrderInput {
  suggestedOrder: number;
}

export function suggestOrder(selections: OrderInput[]): OrderedItem[] {
  const indexed = selections.map((sel, originalIndex) => ({ ...sel, originalIndex }));

  const sorted = [...indexed].sort((a, b) => {
    const ap = hasPerishable(a.recipe) ? 0 : 1;
    const bp = hasPerishable(b.recipe) ? 0 : 1;
    if (ap !== bp) return ap - bp;

    if (a.recipe.difficulty !== b.recipe.difficulty) {
      return a.recipe.difficulty - b.recipe.difficulty;
    }

    if (a.recipe.estimatedMinutes !== b.recipe.estimatedMinutes) {
      return a.recipe.estimatedMinutes - b.recipe.estimatedMinutes;
    }

    return a.originalIndex - b.originalIndex;
  });

  return sorted.map((sel, idx) => ({
    request: sel.request,
    recipe: sel.recipe,
    suggestedOrder: idx + 1,
  }));
}
