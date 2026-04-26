import { z } from "zod";
import type {
  ShoppingItem,
  ShoppingItemStatus,
  ShoppingList,
} from "./types";
import type { AggregatedQuantity } from "./aggregate";

export const aggregatedQuantitySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("sum"), value: z.number(), unit: z.string().min(1) }),
  z.object({ kind: z.literal("mixed"), parts: z.array(z.string().min(1)) }),
  z.object({ kind: z.literal("free"), note: z.string() }),
]) satisfies z.ZodType<AggregatedQuantity>;

export const shoppingItemStatusSchema = z.enum([
  "pending",
  "bought",
  "have_at_home",
  "ignored",
]) satisfies z.ZodType<ShoppingItemStatus>;

export const shoppingItemSchema = z.object({
  id: z.string().min(1),
  canonicalName: z.string().min(1),
  aggregatedQuantity: aggregatedQuantitySchema,
  sourceRecipeIds: z.array(z.string().min(1)),
  status: shoppingItemStatusSchema,
  updatedAt: z.string().min(1),
}) satisfies z.ZodType<ShoppingItem>;

export const shoppingListSchema = z.object({
  id: z.string().min(1),
  batchId: z.string().min(1),
  items: z.array(shoppingItemSchema),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
}) satisfies z.ZodType<ShoppingList>;
