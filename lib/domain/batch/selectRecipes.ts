import type { Recipe, MealType } from "@/lib/domain/recipe/types";

export interface ItemRequest {
  mealType: MealType;
}

export interface SelectionResult {
  request: ItemRequest;
  recipeId: string | null;
}

export interface SelectCandidates {
  current: Recipe[];
  review: Recipe[];
}

export interface SelectRecipesOptions {
  reviewRatio: number;
}

function pickWithRng<T>(items: T[], rng: () => number): T | null {
  if (items.length === 0) return null;
  const idx = Math.min(items.length - 1, Math.floor(rng() * items.length));
  return items[idx] ?? null;
}

export function selectRecipesForItems(
  requests: ItemRequest[],
  candidates: SelectCandidates,
  options: SelectRecipesOptions,
  rng: () => number = Math.random,
): SelectionResult[] {
  const ratio = Math.max(0, Math.min(1, options.reviewRatio));
  const total = requests.length;
  const targetReview = Math.round(total * ratio);

  const usedIds = new Set<string>();
  const results: SelectionResult[] = [];

  const buckets = {
    current: bucketByMeal(candidates.current),
    review: bucketByMeal(candidates.review),
  };

  let reviewAssigned = 0;

  for (let i = 0; i < requests.length; i++) {
    const request = requests[i]!;
    const remaining = total - i;
    const reviewLeftToHit = targetReview - reviewAssigned;
    const preferReview = reviewLeftToHit >= remaining || (reviewLeftToHit > 0 && rng() < reviewLeftToHit / remaining);

    const order: Array<"review" | "current"> = preferReview
      ? ["review", "current"]
      : ["current", "review"];

    let chosen: Recipe | null = null;
    let chosenSource: "current" | "review" | null = null;

    for (const source of order) {
      const pool = buckets[source][request.mealType] ?? [];
      const available = pool.filter((r) => !usedIds.has(r.id));
      const picked = pickWithRng(available, rng);
      if (picked) {
        chosen = picked;
        chosenSource = source;
        break;
      }
    }

    if (chosen && chosenSource) {
      usedIds.add(chosen.id);
      if (chosenSource === "review") reviewAssigned++;
      results.push({ request, recipeId: chosen.id });
    } else {
      results.push({ request, recipeId: null });
    }
  }

  return results;
}

function bucketByMeal(recipes: Recipe[]): Record<MealType, Recipe[]> {
  const out: Record<MealType, Recipe[]> = {
    cafe: [],
    almoco: [],
    jantar: [],
    lanche: [],
  };
  for (const r of recipes) {
    out[r.mealType].push(r);
  }
  return out;
}
