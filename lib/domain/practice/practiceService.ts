import { randomUUID } from "node:crypto";
import type { Recipe, RecipeStatus } from "@/lib/domain/recipe/types";
import type { RecipeRepository } from "@/lib/persistence/repositories/recipeRepository";
import type {
  ListPracticeEventsOptions,
  PracticeEventRepository,
} from "@/lib/persistence/repositories/practiceEventRepository";
import type { PracticeEvent, PracticeEventType } from "./types";

export class RecipeNotFoundError extends Error {
  constructor(recipeId: string) {
    super(`Receita "${recipeId}" nao encontrada.`);
    this.name = "RecipeNotFoundError";
  }
}

export interface PracticeHistoryItem {
  event: PracticeEvent;
  recipe: { id: string; title: string; mealType: Recipe["mealType"] } | null;
}

export async function markCompleted(
  recipeRepo: RecipeRepository,
  eventRepo: PracticeEventRepository,
  recipeId: string,
  reflection: string | null,
): Promise<void> {
  await applyTransition(recipeRepo, eventRepo, recipeId, "feita", "completed", reflection);
}

export async function markRejected(
  recipeRepo: RecipeRepository,
  eventRepo: PracticeEventRepository,
  recipeId: string,
): Promise<void> {
  await applyTransition(recipeRepo, eventRepo, recipeId, "rejeitada", "rejected", null);
}

export async function revert(
  recipeRepo: RecipeRepository,
  eventRepo: PracticeEventRepository,
  recipeId: string,
): Promise<void> {
  await applyTransition(recipeRepo, eventRepo, recipeId, "sugerida", "reverted", null);
}

async function applyTransition(
  recipeRepo: RecipeRepository,
  eventRepo: PracticeEventRepository,
  recipeId: string,
  nextStatus: RecipeStatus,
  eventType: PracticeEventType,
  reflection: string | null,
): Promise<void> {
  const recipe = await recipeRepo.findById(recipeId);
  if (!recipe) throw new RecipeNotFoundError(recipeId);

  await recipeRepo.updateStatus(recipeId, nextStatus);

  const event: PracticeEvent = {
    id: randomUUID(),
    recipeId,
    moduleId: recipe.moduleId,
    type: eventType,
    reflection,
    createdAt: new Date().toISOString(),
  };
  await eventRepo.insert(event);
}

export async function getHistoryView(
  recipeRepo: RecipeRepository,
  eventRepo: PracticeEventRepository,
  options: ListPracticeEventsOptions = {},
): Promise<PracticeHistoryItem[]> {
  const events = await eventRepo.listAll(options);
  if (events.length === 0) return [];

  const ids = Array.from(new Set(events.map((e) => e.recipeId)));
  const recipes = new Map<string, Recipe>();
  for (const id of ids) {
    const r = await recipeRepo.findById(id);
    if (r) recipes.set(id, r);
  }

  return events.map((event) => {
    const r = recipes.get(event.recipeId);
    return {
      event,
      recipe: r ? { id: r.id, title: r.title, mealType: r.mealType } : null,
    };
  });
}
