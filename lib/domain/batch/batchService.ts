import { randomUUID } from "node:crypto";
import type { Curriculum, Module } from "@/lib/domain/curriculum/types";
import type {
  Batch,
  BatchItem,
  BatchItemStatus,
  MealsByType,
} from "./types";
import type { GenerationContext } from "@/lib/domain/generation/types";
import type { MealType, Recipe } from "@/lib/domain/recipe/types";
import type { BatchRepository } from "@/lib/persistence/repositories/batchRepository";
import type { RecipeRepository } from "@/lib/persistence/repositories/recipeRepository";
import {
  getRecipesForModule,
  type GetRecipesForModuleOptions,
} from "@/lib/domain/recipe/recipeService";
import { markCompleted } from "@/lib/domain/practice/practiceService";
import type { PracticeEventRepository } from "@/lib/persistence/repositories/practiceEventRepository";
import type { RecipeGenerator } from "@/lib/llm/generateRecipes";
import { selectRecipesForItems, type ItemRequest } from "./selectRecipes";
import { suggestOrder } from "./suggestOrder";

const DEFAULT_REVIEW_RATIO = 0.25;

export class BatchNotFoundError extends Error {
  constructor(id: string) {
    super(`Lote "${id}" nao encontrado.`);
    this.name = "BatchNotFoundError";
  }
}

export class BatchItemNotFoundError extends Error {
  constructor(id: string) {
    super(`Item "${id}" nao encontrado no lote.`);
    this.name = "BatchItemNotFoundError";
  }
}

export interface CreateBatchInput {
  mealsByType: Partial<MealsByType>;
  generationContext: GenerationContext;
}

export interface BatchServiceDeps {
  batchRepository: BatchRepository;
  recipeRepository: RecipeRepository;
  recipeGenerator: RecipeGenerator;
  practiceEventRepository: PracticeEventRepository;
  curriculum: Curriculum;
  currentModuleId: string;
  completedModuleIds: string[];
  reviewRatio?: number;
}

function fillMealsByType(input: Partial<MealsByType>): MealsByType {
  return {
    cafe: input.cafe ?? 0,
    almoco: input.almoco ?? 0,
    jantar: input.jantar ?? 0,
    lanche: input.lanche ?? 0,
  };
}

function expandRequests(meals: MealsByType): ItemRequest[] {
  const out: ItemRequest[] = [];
  (["cafe", "almoco", "jantar", "lanche"] as MealType[]).forEach((mt) => {
    for (let i = 0; i < meals[mt]; i++) out.push({ mealType: mt });
  });
  return out;
}

function findModule(curriculum: Curriculum, id: string): Module {
  const m = curriculum.modules.find((mod) => mod.id === id);
  if (!m) throw new Error(`Modulo "${id}" nao encontrado.`);
  return m;
}

export async function createBatch(
  deps: BatchServiceDeps,
  input: CreateBatchInput,
): Promise<Batch> {
  const meals = fillMealsByType(input.mealsByType);
  const total = meals.cafe + meals.almoco + meals.jantar + meals.lanche;
  if (total <= 0) {
    throw new Error("Lote precisa de pelo menos uma refeicao.");
  }

  const requests = expandRequests(meals);
  const currentModule = findModule(deps.curriculum, deps.currentModuleId);

  const currentRecipes = await deps.recipeRepository.findByModuleId(
    deps.currentModuleId,
    { excludeStatuses: ["rejeitada"] },
  );

  const reviewRecipes: Recipe[] = [];
  for (const moduleId of deps.completedModuleIds) {
    if (moduleId === deps.currentModuleId) continue;
    const recipes = await deps.recipeRepository.findByModuleId(moduleId, {
      excludeStatuses: ["rejeitada"],
    });
    reviewRecipes.push(...recipes);
  }

  // Conta candidatos por mealType no modulo atual; gera o que falta.
  const currentByMeal: Record<MealType, number> = {
    cafe: 0,
    almoco: 0,
    jantar: 0,
    lanche: 0,
  };
  for (const r of currentRecipes) currentByMeal[r.mealType]++;

  const reviewByMeal: Record<MealType, number> = {
    cafe: 0,
    almoco: 0,
    jantar: 0,
    lanche: 0,
  };
  for (const r of reviewRecipes) reviewByMeal[r.mealType]++;

  let needed = 0;
  (["cafe", "almoco", "jantar", "lanche"] as MealType[]).forEach((mt) => {
    const want = meals[mt];
    if (want === 0) return;
    const have = currentByMeal[mt] + reviewByMeal[mt];
    if (have < want) needed += want - have;
  });

  let pool = currentRecipes;
  if (needed > 0) {
    const minCount = currentRecipes.length + needed;
    const opts: GetRecipesForModuleOptions = { minCount };
    pool = await getRecipesForModule(
      deps.recipeRepository,
      deps.recipeGenerator,
      currentModule,
      input.generationContext,
      opts,
    );
  }

  const reviewRatio = deps.reviewRatio ?? DEFAULT_REVIEW_RATIO;
  const selections = selectRecipesForItems(
    requests,
    { current: pool, review: reviewRecipes },
    { reviewRatio },
  );

  const allRecipes = new Map<string, Recipe>();
  for (const r of [...pool, ...reviewRecipes]) allRecipes.set(r.id, r);

  const orderInputs = selections
    .map((sel) => {
      if (!sel.recipeId) return null;
      const recipe = allRecipes.get(sel.recipeId);
      if (!recipe) return null;
      return { request: sel.request, recipe };
    })
    .filter((x): x is { request: ItemRequest; recipe: Recipe } => x !== null);

  const ordered = suggestOrder(orderInputs);

  const items: BatchItem[] = ordered.map((entry) => ({
    id: randomUUID(),
    mealType: entry.request.mealType,
    recipeId: entry.recipe.id,
    suggestedOrder: entry.suggestedOrder,
    status: "pending",
    doneAt: null,
  }));

  const now = new Date().toISOString();
  const batch: Batch = {
    id: randomUUID(),
    mealsByType: meals,
    items,
    generationContextSnapshot: input.generationContext,
    createdAt: now,
    updatedAt: now,
  };

  // Se faltou candidato mesmo apos geracao, ajusta mealsByType para nao bater no schema.
  const actualByMeal: MealsByType = { cafe: 0, almoco: 0, jantar: 0, lanche: 0 };
  for (const it of items) actualByMeal[it.mealType]++;
  batch.mealsByType = actualByMeal;

  await deps.batchRepository.insert(batch);
  return batch;
}

export async function getActiveBatch(
  deps: Pick<BatchServiceDeps, "batchRepository">,
): Promise<Batch | null> {
  return deps.batchRepository.findActive();
}

export async function listBatches(
  deps: Pick<BatchServiceDeps, "batchRepository">,
): Promise<Batch[]> {
  return deps.batchRepository.list();
}

export async function getBatch(
  deps: Pick<BatchServiceDeps, "batchRepository">,
  id: string,
): Promise<Batch | null> {
  return deps.batchRepository.findById(id);
}

interface ItemMutationDeps {
  batchRepository: BatchRepository;
  recipeRepository: RecipeRepository;
  practiceEventRepository: PracticeEventRepository;
}

async function findItem(
  deps: Pick<ItemMutationDeps, "batchRepository">,
  batchId: string,
  itemId: string,
): Promise<{ batch: Batch; item: BatchItem }> {
  const batch = await deps.batchRepository.findById(batchId);
  if (!batch) throw new BatchNotFoundError(batchId);
  const item = batch.items.find((i) => i.id === itemId);
  if (!item) throw new BatchItemNotFoundError(itemId);
  return { batch, item };
}

export async function markItemDone(
  deps: ItemMutationDeps,
  batchId: string,
  itemId: string,
  reflection: string | null,
): Promise<void> {
  const { item } = await findItem(deps, batchId, itemId);
  await markCompleted(
    deps.recipeRepository,
    deps.practiceEventRepository,
    item.recipeId,
    reflection,
  );
  await deps.batchRepository.updateItemStatus(
    batchId,
    itemId,
    "done",
    new Date().toISOString(),
  );
}

export async function skipItem(
  deps: Pick<BatchServiceDeps, "batchRepository">,
  batchId: string,
  itemId: string,
): Promise<void> {
  await findItem(deps, batchId, itemId);
  await deps.batchRepository.updateItemStatus(batchId, itemId, "skipped", null);
}

export async function setItemPending(
  deps: Pick<BatchServiceDeps, "batchRepository">,
  batchId: string,
  itemId: string,
): Promise<void> {
  await findItem(deps, batchId, itemId);
  await deps.batchRepository.updateItemStatus(batchId, itemId, "pending", null);
}

export interface ReplaceItemDeps extends ItemMutationDeps {
  recipeGenerator: RecipeGenerator;
  curriculum: Curriculum;
  currentModuleId: string;
}

export async function replaceItemRecipe(
  deps: ReplaceItemDeps,
  batchId: string,
  itemId: string,
): Promise<void> {
  const { batch, item } = await findItem(deps, batchId, itemId);
  const usedIds = new Set(batch.items.map((i) => i.recipeId));

  const candidates = await deps.recipeRepository.findByModuleId(
    deps.currentModuleId,
    { excludeStatuses: ["rejeitada"] },
  );
  let candidate = candidates.find(
    (r) => r.mealType === item.mealType && !usedIds.has(r.id),
  );

  if (!candidate) {
    const ctx = batch.generationContextSnapshot;
    if (!ctx) {
      throw new Error("Lote sem contexto de geracao salvo; nao e possivel gerar substituta.");
    }
    const currentModule = findModule(deps.curriculum, deps.currentModuleId);
    const generated = await deps.recipeGenerator.generateRecipesForModule(
      currentModule,
      1,
      ctx,
    );
    if (generated.length === 0) {
      throw new Error("Nao foi possivel gerar receita substituta.");
    }
    await deps.recipeRepository.insertMany(generated);
    candidate = generated[0]!;
  }

  await deps.batchRepository.replaceItemRecipe(batchId, itemId, candidate.id);
}

export async function reorderItems(
  deps: Pick<BatchServiceDeps, "batchRepository">,
  batchId: string,
  orderedItemIds: string[],
): Promise<void> {
  const batch = await deps.batchRepository.findById(batchId);
  if (!batch) throw new BatchNotFoundError(batchId);
  await deps.batchRepository.reorderItems(batchId, orderedItemIds);
}

export function progressOf(batch: Batch): {
  total: number;
  done: number;
  skipped: number;
  pending: number;
} {
  const counts = { total: batch.items.length, done: 0, skipped: 0, pending: 0 };
  for (const item of batch.items) {
    counts[item.status as "done" | "skipped" | "pending"]++;
  }
  return counts;
}

export function nextSuggestion(batch: Batch): BatchItem | null {
  const pending = batch.items
    .filter((i) => i.status === "pending")
    .sort((a, b) => a.suggestedOrder - b.suggestedOrder);
  return pending[0] ?? null;
}

export type _BatchItemStatus = BatchItemStatus;
