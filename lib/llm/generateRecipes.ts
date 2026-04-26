import { z } from "zod";
import { generateObject } from "ai";
import { randomUUID } from "node:crypto";
import { difficultySchema } from "@/lib/domain/curriculum/schema";
import { ingredientSchema, mealTypeSchema } from "@/lib/domain/recipe/schema";
import type { Module } from "@/lib/domain/curriculum/types";
import type { Recipe } from "@/lib/domain/recipe/types";
import { buildGenerateRecipesPrompt } from "@/lib/llm/prompts/generateRecipes";
import { getRichModel } from "@/lib/llm/provider";

const generatedRecipeSchema = z.object({
  title: z.string().min(1),
  mealType: mealTypeSchema,
  servings: z.number().int().positive(),
  estimatedMinutes: z.number().int().positive(),
  difficulty: difficultySchema,
  ingredients: z.array(ingredientSchema).min(1),
  steps: z.array(z.string().min(1)).min(1),
  teachesConcepts: z.array(z.string().min(1)).min(1),
});

const responseSchema = z.object({
  recipes: z.array(generatedRecipeSchema),
});

export interface RecipeGenerator {
  generateRecipesForModule(module: Module, count: number): Promise<Recipe[]>;
}

export const recipeGenerator: RecipeGenerator = {
  generateRecipesForModule: generateRecipesForModule,
};

export async function generateRecipesForModule(
  module: Module,
  count: number,
): Promise<Recipe[]> {
  if (count <= 0) return [];

  const prompt = buildGenerateRecipesPrompt(module, count);

  const { object } = await generateObject({
    model: getRichModel(),
    schema: responseSchema,
    prompt,
  });

  const now = new Date().toISOString();
  return object.recipes.map((r): Recipe => ({
    id: randomUUID(),
    moduleId: module.id,
    title: r.title,
    mealType: r.mealType,
    servings: r.servings,
    estimatedMinutes: r.estimatedMinutes,
    difficulty: r.difficulty,
    ingredients: r.ingredients,
    steps: r.steps,
    teachesConcepts: r.teachesConcepts,
    status: "sugerida",
    createdAt: now,
    updatedAt: now,
  }));
}
