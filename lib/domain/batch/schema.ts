import { z } from "zod";
import { mealTypeSchema } from "@/lib/domain/recipe/schema";
import type {
  Batch,
  BatchItem,
  BatchItemStatus,
  MealsByType,
} from "./types";

const generationContextSchema = z.object({
  restrictions: z.array(z.string()),
  dislikes: z.array(z.string()),
  preferences: z.array(z.string()),
  abundantIngredients: z.array(z.string()),
  servings: z.number().int().positive(),
});

export const batchItemStatusSchema = z.enum([
  "pending",
  "done",
  "skipped",
]) satisfies z.ZodType<BatchItemStatus>;

export const batchItemSchema = z.object({
  id: z.string().min(1),
  mealType: mealTypeSchema,
  recipeId: z.string().min(1),
  suggestedOrder: z.number().int().positive(),
  status: batchItemStatusSchema,
  doneAt: z.string().nullable(),
}) satisfies z.ZodType<BatchItem>;

export const mealsByTypeSchema = z.object({
  cafe: z.number().int().nonnegative(),
  almoco: z.number().int().nonnegative(),
  jantar: z.number().int().nonnegative(),
  lanche: z.number().int().nonnegative(),
}) satisfies z.ZodType<MealsByType>;

export const batchSchema = z
  .object({
    id: z.string().min(1),
    mealsByType: mealsByTypeSchema,
    items: z.array(batchItemSchema),
    generationContextSnapshot: generationContextSchema.nullable(),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
  })
  .superRefine((batch, ctx) => {
    const ids = new Set<string>();
    for (const item of batch.items) {
      if (ids.has(item.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["items"],
          message: `BatchItem id duplicado: "${item.id}"`,
        });
        return;
      }
      ids.add(item.id);
    }

    const orders = batch.items.map((i) => i.suggestedOrder).sort((a, b) => a - b);
    for (let i = 0; i < orders.length; i++) {
      if (orders[i] !== i + 1) {
        ctx.addIssue({
          code: "custom",
          path: ["items"],
          message: `suggestedOrder deve ser contiguo de 1 a ${orders.length}`,
        });
        return;
      }
    }

    const sum =
      batch.mealsByType.cafe +
      batch.mealsByType.almoco +
      batch.mealsByType.jantar +
      batch.mealsByType.lanche;
    if (batch.items.length !== sum) {
      ctx.addIssue({
        code: "custom",
        path: ["items"],
        message: `items.length (${batch.items.length}) diferente da soma de mealsByType (${sum})`,
      });
    }
  }) satisfies z.ZodType<Batch>;
