import type { Difficulty } from "@/lib/domain/curriculum/types";

export type MealType = "cafe" | "almoco" | "jantar" | "lanche";

export type RecipeStatus = "sugerida" | "feita" | "rejeitada";

export interface Ingredient {
  name: string;
  quantity: string;
}

export interface Recipe {
  id: string;
  moduleId: string;
  title: string;
  mealType: MealType;
  servings: number;
  estimatedMinutes: number;
  difficulty: Difficulty;
  ingredients: Ingredient[];
  steps: string[];
  teachesConcepts: string[];
  status: RecipeStatus;
  createdAt: string;
  updatedAt: string;
}
