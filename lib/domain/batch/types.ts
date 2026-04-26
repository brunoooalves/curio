import type { GenerationContext } from "@/lib/domain/generation/types";
import type { MealType } from "@/lib/domain/recipe/types";

export type BatchItemStatus = "pending" | "done" | "skipped";

export interface BatchItem {
  id: string;
  mealType: MealType;
  recipeId: string;
  suggestedOrder: number;
  status: BatchItemStatus;
  doneAt: string | null;
}

export type MealsByType = Record<MealType, number>;

export interface Batch {
  id: string;
  mealsByType: MealsByType;
  items: BatchItem[];
  generationContextSnapshot: GenerationContext | null;
  createdAt: string;
  updatedAt: string;
}
