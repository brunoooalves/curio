import { z } from "zod";
import type { DietaryContext } from "./types";

export const dietaryContextSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  restrictions: z.array(z.string()),
  dislikes: z.array(z.string()),
  preferences: z.array(z.string()),
  servingsOverride: z.number().int().positive().nullable(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
}) satisfies z.ZodType<DietaryContext>;
