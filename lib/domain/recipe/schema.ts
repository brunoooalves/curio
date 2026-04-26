import { z } from "zod";
import { difficultySchema } from "@/lib/domain/curriculum/schema";
import type { Recipe, Ingredient, MealType, RecipeStatus } from "./types";

export const mealTypeSchema = z.enum(["cafe", "almoco", "jantar", "lanche"]) satisfies z.ZodType<MealType>;

export const recipeStatusSchema = z.enum([
  "sugerida",
  "feita",
  "rejeitada",
]) satisfies z.ZodType<RecipeStatus>;

export const ingredientSchema = z.object({
  name: z.string().min(1),
  quantity: z.string().min(1),
}) satisfies z.ZodType<Ingredient>;

export const recipeSchema = z.object({
  id: z.string().min(1),
  moduleId: z.string().min(1),
  title: z.string().min(1),
  mealType: mealTypeSchema,
  servings: z.number().int().positive(),
  estimatedMinutes: z.number().int().positive(),
  difficulty: difficultySchema,
  ingredients: z.array(ingredientSchema).min(1),
  steps: z.array(z.string().min(1)).min(1),
  teachesConcepts: z.array(z.string().min(1)),
  status: recipeStatusSchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
}) satisfies z.ZodType<Recipe>;
