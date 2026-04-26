import { z } from "zod";
import type { PracticeEvent, PracticeEventType } from "./types";

export const practiceEventTypeSchema = z.enum([
  "completed",
  "rejected",
  "reverted",
]) satisfies z.ZodType<PracticeEventType>;

export const practiceEventSchema = z.object({
  id: z.string().min(1),
  recipeId: z.string().min(1),
  moduleId: z.string().min(1),
  type: practiceEventTypeSchema,
  reflection: z.string().nullable(),
  createdAt: z.string().min(1),
}) satisfies z.ZodType<PracticeEvent>;
