import { z } from "zod";
import type { NormalizedIngredient } from "./types";

export const normalizedIngredientSchema = z.object({
  canonicalName: z.string().min(1),
  aliases: z.array(z.string().min(1)),
  defaultUnit: z.string().min(1).nullable(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
}) satisfies z.ZodType<NormalizedIngredient>;
