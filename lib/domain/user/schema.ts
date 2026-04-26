import { z } from "zod";
import { USER_STATE_ID, type UserProfile, type UserState } from "./types";

export const userProfileSchema = z.object({
  restrictions: z.array(z.string()),
  dislikes: z.array(z.string()),
  preferences: z.array(z.string()),
  abundantIngredients: z.array(z.string()),
  servingsDefault: z.number().int().positive(),
}) satisfies z.ZodType<UserProfile>;

export const userStateSchema = z.object({
  id: z.literal(USER_STATE_ID),
  currentModuleId: z.string().min(1),
  completedModuleIds: z.array(z.string().min(1)),
  profile: userProfileSchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
}) satisfies z.ZodType<UserState>;
